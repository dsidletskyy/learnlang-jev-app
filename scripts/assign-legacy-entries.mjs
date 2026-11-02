import { pathToFileURL } from 'node:url';
import pg from 'pg';

export async function assignLegacyEntries(pool, accountId) {
  if (typeof accountId !== 'string' || !accountId.trim()) throw new Error('An account ID is required');
  const client = await pool.connect();
  try {
    await client.query('begin');
    const account = await client.query('select id from "user" where id = $1 and email_verified = true for update', [accountId]);
    if (account.rowCount !== 1) throw new Error('Account does not exist or is not verified');
    const result = await client.query('update dictionary_entries set owner_id = $1 where owner_id is null', [accountId]);
    await client.query('commit');
    return result.rowCount;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || !process.env.DATABASE_URL) {
    console.error('Usage: node --env-file-if-exists=.env scripts/assign-legacy-entries.mjs ACCOUNT_ID (DATABASE_URL required)');
    process.exitCode = 1;
  } else {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
    try {
      const count = await assignLegacyEntries(pool, process.argv[2]);
      console.log(`Assigned ${count} legacy entries.`);
    } catch {
      console.error('Assignment failed. Check the account ID, verification status and database, then retry.');
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  }
}
