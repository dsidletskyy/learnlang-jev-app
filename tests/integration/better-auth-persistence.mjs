import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../../db/schema.ts';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
if (process.env.TEST_DATABASE_URL !== testUrl) throw new Error('TEST_DATABASE_URL must explicitly match the dedicated test database');
const admin = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
await admin.connect();
const identity = await admin.query('select current_database() as db, current_user as username');
assert.deepEqual(identity.rows[0], { db: 'language_test', username: 'language_test' });
const namespace = `auth_test_${randomUUID().replaceAll('-', '')}`;
await admin.query(`create schema "${namespace}"`);
const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
try {
  const migration = await readFile('drizzle/0003_better_auth.sql', 'utf8');
  await pool.query(migration.replaceAll('\"public\".', `\"${namespace}\".`));
  let verificationUrl;
  const auth = betterAuth({
    baseURL: 'http://localhost:3000',
    secret: 'test-secret-for-better-auth-persistence-only',
    database: drizzleAdapter(drizzle(pool), { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 86400,
      sendVerificationEmail: async ({ url }) => { verificationUrl = url; },
    },
  });
  const request = (path, body) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body),
  }));
  const credentials = { email: 'person@example.com', password: 'a long passphrase', name: 'Person' };
  const signup = await request('sign-up/email', credentials);
  assert.equal(signup.status, 200);
  assert.equal(signup.headers.get('set-cookie'), null);
  assert.ok(verificationUrl);
  assert.notEqual((await request('sign-in/email', credentials)).status, 200);
  const verified = await auth.handler(new Request(verificationUrl));
  assert.equal(verified.status, 302);
  assert.equal(verified.headers.get('set-cookie'), null);
  const replay = await auth.handler(new Request(verificationUrl));
  assert.equal(replay.status, 302);
  assert.equal(replay.headers.get('set-cookie'), null);
  const signin = await request('sign-in/email', credentials);
  assert.equal(signin.status, 200);
  assert.match(signin.headers.get('set-cookie'), /HttpOnly/i);
  const cookie = signin.headers.get('set-cookie').split(';')[0];
  const signout = await auth.handler(new Request('http://localhost:3000/api/auth/sign-out', {
    method: 'POST', headers: { origin: 'http://localhost:3000', cookie },
  }));
  assert.equal(signout.status, 200);
  const session = await auth.handler(new Request('http://localhost:3000/api/auth/get-session', { headers: { cookie } }));
  assert.equal(await session.json(), null);
  console.log('Better Auth persists verification and manual sign-in in PostgreSQL.');
} finally {
  await pool.end();
  await admin.query(`drop schema "${namespace}" cascade`);
  await admin.end();
}
