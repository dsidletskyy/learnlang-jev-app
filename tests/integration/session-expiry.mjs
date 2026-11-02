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
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './auth-configuration') return next('./auth-configuration.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './verification-mail') return next('./verification-mail.ts', context);
  return next(specifier, context);
} });
const { createAuth, validatedSession } = await import('../../lib/auth.ts');
const { sessionCookieOptions } = await import('../../lib/session-cookie.ts');
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
const day = 86400 * 1000;

test('browser cookie and server session honor active, idle and absolute expiry', async t => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
  await admin.connect();
  assert.deepEqual((await admin.query('select current_database() as db, current_user as username')).rows[0], { db: 'language_test', username: 'language_test' });
  const namespace = `session_expiry_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    let link;
    const auth = createAuth(drizzle(pool), { baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async (_, url) => { link = url; } });
    const credentials = { email: 'person@example.com', password: 'a long passphrase', name: 'Person' };
    const request = (path, body) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body) }));
    assert.equal((await request('sign-up/email', credentials)).status, 200);
    assert.equal((await auth.handler(new Request(link))).status, 302);
    const start = Date.now();
    t.mock.timers.enable({ apis: ['Date'], now: start });
    const signin = await request('sign-in/email', credentials);
    assert.equal(signin.status, 200);
    const cookie = signin.headers.get('set-cookie').split(';')[0];
    const options = sessionCookieOptions('http://localhost:3000');
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal(options.secure, false);
    assert.equal(sessionCookieOptions('https://localhost:3000').secure, true);
    const browserHeaders = () => new Headers({ cookie: Date.now() < start + options.maxAge * 1000 ? cookie : '' });
    for (const elapsed of [6, 12, 18, 24, 29]) {
      t.mock.timers.setTime(start + elapsed * day);
      assert.ok(await validatedSession(auth, browserHeaders()), `active session at day ${elapsed}`);
    }
    t.mock.timers.setTime(start + 30 * day);
    assert.equal(await validatedSession(auth, browserHeaders()), null);
    assert.equal(await validatedSession(auth, new Headers({ cookie })), null, 'replayed cookie must fail absolute limit');

    const idleSignin = await request('sign-in/email', credentials);
    const idleCookie = idleSignin.headers.get('set-cookie').split(';')[0];
    t.mock.timers.setTime(start + 37 * day);
    assert.equal(await validatedSession(auth, new Headers({ cookie: idleCookie })), null, 'idle session must expire');
  } finally {
    t.mock.timers.reset();
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});
