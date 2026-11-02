import { createHash, randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { Pool, PoolClient } from 'pg';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

// Serialize sign-in and recovery for one normalized identifier, including provider writes.
export async function withIdentifierLock<T>(pool: Pool, email: string, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [email.toLowerCase()]);
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function requestPasswordRecovery(pool: Pool, email: string, baseURL: string, send: (email: string, url: string) => Promise<void>) {
  const token = randomBytes(32).toString('base64url');
  await withIdentifierLock(pool, email, async client => {
    const user = await client.query('SELECT id, email FROM "user" WHERE email = $1', [email.toLowerCase()]);
    if (!user.rowCount) return;
    await client.query(`INSERT INTO password_recovery (user_id, token_hash, expires_at) VALUES ($1, $2, clock_timestamp() + interval '1 hour')
      ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`, [user.rows[0].id, digest(token)]);
    const recipient = user.rows[0].email as string;
    const url = new URL('/reset-password', baseURL);
    url.searchParams.set('token', token);
    try { await send(recipient, url.toString()); } catch { console.error('Password recovery email delivery failed'); }
  });
}

export async function completePasswordRecovery(pool: Pool, token: string, password: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const tokenHash = digest(token);
  const user = await pool.query('SELECT u.email FROM password_recovery r JOIN "user" u ON u.id = r.user_id WHERE r.token_hash = $1', [tokenHash]);
  if (!user.rowCount) return false;
  const hash = await hashPassword(password);
  return withIdentifierLock(pool, user.rows[0].email, async client => {
    const recovery = await client.query('SELECT user_id FROM password_recovery WHERE token_hash = $1 AND expires_at > clock_timestamp() FOR UPDATE', [tokenHash]);
    if (!recovery.rowCount) return false;
    const id = recovery.rows[0].user_id;
    const updated = await client.query("UPDATE account SET password = $1, updated_at = clock_timestamp() WHERE user_id = $2 AND provider_id = 'credential' RETURNING id", [hash, id]);
    if (updated.rowCount !== 1) throw new Error('Credential update failed');
    await client.query('DELETE FROM session WHERE user_id = $1', [id]);
    const deleted = await client.query('DELETE FROM password_recovery WHERE token_hash = $1 RETURNING user_id', [tokenHash]);
    if (deleted.rowCount !== 1) throw new Error('Recovery consumption failed');
    return true;
  });
}
