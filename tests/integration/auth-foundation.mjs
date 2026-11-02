import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import net from 'node:net';
import { test } from 'node:test';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === '../db/schema') return next('../db/schema.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './session-cookie') return next('./session-cookie.ts', context);
  return next(specifier, context);
} });
const { createAuth, createLocalAuth, validatedSession } = await import('../../lib/auth.ts');
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

test('production auth foundation verifies email and enforces server-side session limits', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
  await admin.connect();
  assert.deepEqual((await admin.query('select current_database() as db, current_user as username')).rows[0], { db: 'language_test', username: 'language_test' });
  const namespace = `auth_foundation_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    let link;
    const auth = createAuth(drizzle(pool), { baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async (email, url) => { assert.equal(email, 'person@example.com'); link = url; } });
    const request = (path, body, headers = {}) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...headers }, body: JSON.stringify(body) }));
    const credentials = { email: 'person@example.com', password: 'a long passphrase', name: 'Person' };
    const signup = await request('sign-up/email', credentials);
    assert.equal(signup.status, 200);
    assert.equal(signup.headers.get('set-cookie'), null);
    assert.ok(link);
    assert.notEqual((await request('sign-in/email', credentials)).status, 200);
    const verification = await auth.handler(new Request(link));
    assert.equal(verification.status, 302);
    assert.equal(verification.headers.get('set-cookie'), null);
    const replay = await auth.handler(new Request(link));
    assert.equal(replay.status, 302);
    assert.equal(replay.headers.get('set-cookie'), null);
    const signin = await request('sign-in/email', credentials);
    assert.equal(signin.status, 200);
    const setCookie = signin.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.doesNotMatch(setCookie, /Domain=/i);
    assert.doesNotMatch(setCookie, /; Secure/i);
    const headers = new Headers({ cookie: setCookie.split(';')[0] });
    assert.ok(await validatedSession(auth, headers));
    await pool.query('update "user" set email_verified = false where email = $1', [credentials.email]);
    assert.equal(await validatedSession(auth, headers), null);
    await pool.query('update "user" set email_verified = true where email = $1', [credentials.email]);
    await pool.query("update session set created_at = now() - interval '31 days'");
    assert.equal(await validatedSession(auth, headers), null);
    await pool.query("update session set created_at = now(), expires_at = now() - interval '1 second'");
    assert.equal(await validatedSession(auth, headers), null);
    assert.notEqual((await request('sign-in/email', credentials, { origin: 'http://evil.example' })).status, 200);
    const secureAuth = createAuth(drizzle(pool), { baseURL: 'https://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async () => {} });
    const secureSignin = await secureAuth.handler(new Request('https://localhost:3000/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://localhost:3000' }, body: JSON.stringify(credentials) }));
    assert.match(secureSignin.headers.get('set-cookie'), /; Secure/i);
    const secureCookie = secureSignin.headers.get('set-cookie').split(';')[0];
    const secureHeaders = new Headers({ cookie: secureCookie });
    assert.ok(await validatedSession(secureAuth, secureHeaders));
    const signout = await secureAuth.handler(new Request('https://localhost:3000/api/auth/sign-out', { method: 'POST', headers: { origin: 'https://localhost:3000', cookie: secureCookie } }));
    assert.equal(signout.status, 200);
    assert.equal(await validatedSession(secureAuth, secureHeaders), null);
    assert.throws(() => createAuth(drizzle(pool), { baseURL: 'http://example.com', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async () => {} }), /loopback/);
    assert.throws(() => createAuth(drizzle(pool), { baseURL: 'http://localhost:3000', secret: 'short', sendVerification: async () => {} }), /secret/);

    let message = '';
    const smtp = net.createServer(socket => {
      socket.write('220 local test\r\n');
      let buffer = '';
      let data = false;
      socket.on('data', chunk => {
        buffer += chunk.toString();
        let end;
        while ((end = buffer.indexOf('\r\n')) !== -1) {
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (data) {
            if (line === '.') { data = false; socket.write('250 queued\r\n'); }
            else message += `${line}\n`;
          } else if (line.startsWith('EHLO')) socket.write('250 localhost\r\n');
          else if (line === 'DATA') { data = true; socket.write('354 continue\r\n'); }
          else if (line === 'QUIT') socket.end('221 bye\r\n');
          else socket.write('250 ok\r\n');
        }
      });
    });
    await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
    const savedEnv = { ...process.env };
    try {
      process.env.BETTER_AUTH_URL = 'http://localhost:3000';
      process.env.BETTER_AUTH_SECRET = 'test-secret-for-better-auth-persistence-only';
      process.env.AUTH_SMTP_PORT = String(smtp.address().port);
      const local = createLocalAuth(drizzle(pool));
      const response = await local.handler(new Request('http://localhost:3000/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify({ ...credentials, email: 'local@example.com' }) }));
      assert.equal(response.status, 200);
      assert.match(message, /local@example.com/);
      assert.match(message.replaceAll('=\n', '').replaceAll('=3D', '='), /verify-email\?token=/);
      assert.doesNotMatch(await response.text(), /verify-email\?token=/);
      const logged = [];
      const originalError = console.error;
      console.error = (...args) => logged.push(args.join(' '));
      try {
        const failed = createAuth(drizzle(pool), { baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async () => { throw new Error('secret link must not be logged'); } });
        const response = await failed.handler(new Request('http://localhost:3000/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify({ ...credentials, email: 'failed@example.com' }) }));
        assert.equal(response.status, 200);
        assert.equal((await pool.query('select email_verified from "user" where email = $1', ['failed@example.com'])).rows[0].email_verified, false);
        assert.deepEqual(logged, ['Verification email delivery failed']);
      } finally { console.error = originalError; }
    } finally {
      for (const key of ['BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'AUTH_SMTP_PORT']) {
        if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key];
      }
      await new Promise(resolve => smtp.close(resolve));
    }
  } finally {
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});
