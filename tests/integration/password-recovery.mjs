import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import pg from 'pg';
import { verifyPassword } from 'better-auth/crypto';
import { requestPasswordRecovery, completePasswordRecovery } from '../../lib/password-recovery.ts';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
test('recovery supersedes, expires, rolls back failures, revokes sessions and preserves verification', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  const namespace = `recovery_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    await pool.query(await readFile('drizzle/0005_password_recovery.sql', 'utf8'));
    await pool.query(`insert into "user" (id, name, email, email_verified) values ('u', 'User', 'person@example.com', false)`);
    await pool.query(`insert into account (id, account_id, provider_id, user_id, password) values ('a', 'u', 'credential', 'u', 'old')`);
    await pool.query(`insert into session (id, user_id, token, expires_at) values ('s', 'u', 'token', now() + interval '1 day')`);
    const links = [];
    const request = (send = async (_, url) => links.push(url)) => requestPasswordRecovery(pool, 'Person@example.com', 'http://localhost:3000', send);
    const token = () => new URL(links.at(-1)).searchParams.get('token');
    await request(); const first = token();
    await request(); const second = token();
    assert.equal(await completePasswordRecovery(pool, first, 'a new unusual passphrase'), false);
    await pool.query("update password_recovery set expires_at = now() - interval '1 second'");
    assert.equal(await completePasswordRecovery(pool, second, 'a new unusual passphrase'), false);
    await request(); const third = token();
    await pool.query(`create function fail_session_delete() returns trigger language plpgsql as $$ begin raise exception 'injected'; end $$; create trigger fail_delete before delete on session for each row execute function fail_session_delete()`);
    await assert.rejects(completePasswordRecovery(pool, third, 'a new unusual passphrase'));
    assert.equal((await pool.query('select password from account')).rows[0].password, 'old');
    assert.equal((await pool.query('select count(*)::int n from password_recovery')).rows[0].n, 1);
    await pool.query('drop trigger fail_delete on session');
    assert.equal(await completePasswordRecovery(pool, third, 'a new unusual passphrase'), true);
    assert.equal(await completePasswordRecovery(pool, third, 'another unusual passphrase'), false);
    assert.equal((await pool.query('select count(*)::int n from session')).rows[0].n, 0);
    assert.equal((await pool.query('select email_verified from "user"')).rows[0].email_verified, false);
    assert.equal(await verifyPassword({ password: 'a new unusual passphrase', hash: (await pool.query('select password from account')).rows[0].password }), true);
    await request(); const fourth = token();
    const originalError = console.error; const errors = []; console.error = (...args) => errors.push(args.join(' '));
    try { await request(async () => { throw Error('secret'); }); } finally { console.error = originalError; }
    assert.deepEqual(errors, ['Password recovery email delivery failed']);
    assert.equal(await completePasswordRecovery(pool, fourth, 'another unusual passphrase'), false);
    await request(); assert.equal(await completePasswordRecovery(pool, token(), 'another unusual passphrase'), true);
    await pool.query('update "user" set email_verified = true');
    const concurrent = [];
    await Promise.all(Array.from({ length: 6 }, () => request(async (_, url) => concurrent.push(new URL(url).searchParams.get('token')))));
    const outcomes = await Promise.all(concurrent.map(link => completePasswordRecovery(pool, link, 'yet another uncommon passphrase')));
    assert.equal(outcomes.filter(Boolean).length, 1);
    assert.equal((await pool.query('select email_verified from "user"')).rows[0].email_verified, true);
  } finally { await pool.end(); await admin.query(`drop schema "${namespace}" cascade`); await admin.end(); }
});
