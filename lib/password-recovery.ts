import { createHash, randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { Pool, PoolClient } from 'pg';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

// Serialize sign-in and recovery for one normalized identifier, including provider writes.
export async function withIdentifierLock<T>(pool: Pool, email: string, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [email.toLowerCase()]);
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { broken = true; }
    throw error;
  } finally { client.release(broken); }
}

export async function requestPasswordRecovery(pool: Pool | PoolClient, email: string, baseURL: string, send: (email: string, url: string) => Promise<void>) {
  const token = randomBytes(32).toString('base64url');
  const owned = !('release' in pool);
  const client = owned ? await pool.connect() : pool;
  let locked = false;
  let broken = false;
  try {
    // The action shares one pool acquisition: 3s pool + 3s delivery lock +
    // 200ms each for rate limit, identifier lock and upsert + 2s SMTP = 8.6s.
    await client.query("SET lock_timeout = '3s'");
    await client.query("SET statement_timeout = '3s'");
    // Delivery has its own session lock: issuance commits before sending, while
    // reset and sign-in use the separate transaction-scoped identifier lock.
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 1))', [email.toLowerCase()]);
    locked = true;
    await client.query("SET lock_timeout = '200ms'");
    await client.query("SET statement_timeout = '200ms'");
    let recipient: string | undefined;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [email.toLowerCase()]);
      const user = await client.query('SELECT id, email FROM "user" WHERE email = $1', [email.toLowerCase()]);
      if (user.rowCount) {
        await client.query(`INSERT INTO password_recovery (user_id, token_hash, expires_at) VALUES ($1, $2, clock_timestamp() + interval '1 hour')
          ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`, [user.rows[0].id, digest(token)]);
        recipient = user.rows[0].email as string;
      }
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { broken = true; }
      throw error;
    }
    if (recipient) {
      const url = new URL('/reset-password', baseURL);
      url.searchParams.set('token', token);
      try { await send(recipient, url.toString()); } catch { console.error('Password recovery email delivery failed'); }
    }
  } finally {
    if (locked) {
      try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 1))', [email.toLowerCase()]); }
      catch { broken = true; }
    }
    try { await client.query('RESET lock_timeout'); } catch { broken = true; }
    try { await client.query('RESET statement_timeout'); } catch { broken = true; }
    if (owned) client.release(broken);
    else if (broken) throw new Error('Recovery cleanup failed');
  }
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
