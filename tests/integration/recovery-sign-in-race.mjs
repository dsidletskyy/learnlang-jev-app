import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { hashPassword } from 'better-auth/crypto';
import { completePasswordRecovery, requestPasswordRecovery, withIdentifierLock } from '../../lib/password-recovery.ts';

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === '../db/schema') return next('../db/schema.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './session-cookie') return next('./session-cookie.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './auth-configuration') return next('./auth-configuration.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './verification-mail') return next('./verification-mail.ts', context);
  return next(specifier, context);
} });
const { createAuth } = await import('../../lib/auth.ts');
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
const email = 'person@example.com';
const password = 'a long old passphrase';

async function waitForBlocked(pool, fragment) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const { rows } = await pool.query("select 1 from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like $1", [`%${fragment}%`]);
    if (rows.length) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error(`No blocked query: ${fragment}`);
}

test('provider sign-in writes share recovery lock in both orderings', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  const namespace = `recovery_race_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    await pool.query(await readFile('drizzle/0005_password_recovery.sql', 'utf8'));
    await pool.query('insert into "user" (id, name, email, email_verified) values ($1, $2, $3, true)', ['u', 'User', email]);
    await pool.query("insert into account (id, account_id, provider_id, user_id, password) values ('a', 'u', 'credential', 'u', $1)", [await hashPassword(password)]);
    let token;
    const issue = () => requestPasswordRecovery(pool, email, 'http://localhost:3000', async (_, url) => { token = new URL(url).searchParams.get('token'); });
    const provider = client => createAuth(drizzle(client), { baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async () => {} }).handler(new Request('http://localhost:3000/api/auth/sign-in/email', { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }));
    await issue();
    let release, started;
    const hold = new Promise(resolve => { release = resolve; });
    const ready = new Promise(resolve => { started = resolve; });
    const signingIn = withIdentifierLock(pool, email, async client => { const response = await provider(client); started(); await hold; return response; });
    await ready;
    assert.equal((await pool.query('select count(*)::int n from session')).rows[0].n, 0, 'provider session stays uncommitted on locked transaction');
    const resetting = completePasswordRecovery(pool, token, 'a new long passphrase');
    await waitForBlocked(pool, 'pg_advisory_xact_lock(hashtextextended');
    release();
    assert.equal((await signingIn).status, 200);
    assert.equal(await resetting, true);
    assert.equal((await pool.query('select count(*)::int n from session')).rows[0].n, 0);

    await pool.query('update account set password = $1', [await hashPassword(password)]);
    await issue();
    await pool.query("create function block_update() returns trigger language plpgsql as $$ begin perform pg_advisory_xact_lock(918273645); return new; end $$; create trigger block_update before update on account for each row execute function block_update()");
    const blocker = await pool.connect();
    try {
      await blocker.query('begin');
      await blocker.query('select pg_advisory_xact_lock(918273645)');
      const resetFirst = completePasswordRecovery(pool, token, 'a new long passphrase');
      await waitForBlocked(pool, 'UPDATE account SET password');
      const signInSecond = withIdentifierLock(pool, email, provider);
      await waitForBlocked(pool, 'pg_advisory_xact_lock(hashtextextended');
      await blocker.query('commit');
      assert.equal(await resetFirst, true);
      assert.notEqual((await signInSecond).status, 200);
      assert.equal((await pool.query('select count(*)::int n from session')).rows[0].n, 0);
    } finally { blocker.release(); }
  } finally { await pool.end(); await admin.query(`drop schema "${namespace}" cascade`); await admin.end(); }
});
