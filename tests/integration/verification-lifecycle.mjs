import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === '../db/schema') return next('../db/schema.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './session-cookie') return next('./session-cookie.ts', context);
  return next(specifier, context);
} });
const { createAuth } = await import('../../lib/auth.ts');
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

test('verification links expire, survive resend failure, and replay without sessions', async t => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
  await admin.connect();
  assert.deepEqual((await admin.query('select current_database() as db, current_user as username')).rows[0], { db: 'language_test', username: 'language_test' });
  const namespace = `verification_lifecycle_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    const links = [];
    let fail = false;
    const auth = createAuth(drizzle(pool), { baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async (_, url) => { if (fail) throw Error('secret link'); links.push(url); } });
    const post = (path, body) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body) }));
    const start = Date.now();
    t.mock.timers.enable({ apis: ['Date'], now: start });
    const first = { email: 'first@example.com', password: 'a long passphrase', name: 'First' };
    assert.equal((await post('sign-up/email', first)).status, 200);
    const original = links[0];
    t.mock.timers.setTime(start + 2000);
    assert.equal((await post('send-verification-email', { email: first.email })).status, 200);
    assert.equal(links.length, 2);
    fail = true;
    const savedError = console.error;
    const logs = [];
    console.error = (...args) => logs.push(args.join(' '));
    try { assert.equal((await post('send-verification-email', { email: first.email })).status, 200); } finally { console.error = savedError; }
    assert.deepEqual(logs, ['Verification email delivery failed']);
    assert.equal((await pool.query('select email_verified from "user" where email=$1', [first.email])).rows[0].email_verified, false);
    for (const link of [original, original, links[1]]) {
      const response = await auth.handler(new Request(link));
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('set-cookie'), null);
    }
    assert.equal((await pool.query('select email_verified from "user" where email=$1', [first.email])).rows[0].email_verified, true);
    assert.equal((await pool.query('select count(*)::int as count from session')).rows[0].count, 0);
    fail = false;
    const second = { ...first, email: 'expired@example.com' };
    assert.equal((await post('sign-up/email', second)).status, 200);
    const expired = links.at(-1);
    t.mock.timers.setTime(start + 25 * 60 * 60 * 1000);
    const response = await auth.handler(new Request(expired));
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal((await pool.query('select email_verified from "user" where email=$1', [second.email])).rows[0].email_verified, false);
    assert.notEqual((await post('sign-in/email', second)).status, 200);
  } finally {
    t.mock.timers.reset();
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});
