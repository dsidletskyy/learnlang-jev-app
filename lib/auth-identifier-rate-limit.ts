import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

export type AuthLimitOperation = 'sign-in' | 'registration' | 'verification-resend' | 'reset';
const limits: Record<AuthLimitOperation, number> = {
  'sign-in': 5,
  registration: 3,
  'verification-resend': 3,
  reset: 3,
};

// The provider lowercases email identifiers; do not trim or otherwise change its identity rules.
export async function consumeIdentifierAttempt(pool: Pool, operation: AuthLimitOperation, identifier: string): Promise<boolean> {
  const limit = limits[operation];
  if (!limit || typeof identifier !== 'string') throw new Error('Auth rate limit unavailable');
  const identifierHash = createHash('sha256').update(identifier.toLowerCase()).digest('hex');
  try {
    const result = await pool.query(`
      INSERT INTO auth_identifier_rate_limit (operation, identifier_hash, attempts)
      VALUES ($1, $2, ARRAY[clock_timestamp()])
      ON CONFLICT (operation, identifier_hash) DO UPDATE SET
        attempts = ARRAY(
          SELECT attempt FROM unnest(auth_identifier_rate_limit.attempts) AS attempt
          WHERE attempt > clock_timestamp() - interval '15 minutes'
        ) || clock_timestamp()
      WHERE (SELECT count(*) FROM unnest(auth_identifier_rate_limit.attempts) AS attempt
             WHERE attempt > clock_timestamp() - interval '15 minutes') < $3
      RETURNING attempts`, [operation, identifierHash, limit]);
    return result.rowCount === 1;
  } catch {
    throw new Error('Auth rate limit unavailable');
  }
}
