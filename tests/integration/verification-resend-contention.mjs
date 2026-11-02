import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { consumeIdentifierAttempt } from '../../lib/auth-identifier-rate-limit.ts';
import { resendVerification } from '../../lib/verification-resend.ts';

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === '../db/schema') return next('../db/schema.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './session-cookie') return next('./session-cookie.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './auth-configuration') return next('./auth-configuration.ts', context);
  if (context.parentURL?.endsWith('/lib/auth.ts') && specifier === './verification-mail') return next('./verification-mail.ts', context);
  return next(specifier, context);
} });
const { createAuth } = await import('../../lib/auth.ts');
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('resends pad after pool waits and release capacity while padding', { timeout: 15000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  const namespace = `resend_contention_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}`, max: 1 });
  let held;
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    await pool.query(await readFile('drizzle/0004_auth_identifier_rate_limit.sql', 'utf8'));
    let slow = false;
    let slowDone = false;
    let signalSlow;
    const slowFinished = new Promise(resolve => { signalSlow = resolve; });
    const deliver = async () => { if (slow) { await delay(180); slowDone = true; signalSlow(); } };
    const auth = (client, sendVerification = deliver) => createAuth(drizzle(client), {
      baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification,
    });
    const post = (client, path, body, sendVerification) => auth(client, sendVerification).handler(new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body),
    }));
    for (const email of ['verified@example.com', 'unverified@example.com']) {
      assert.equal((await post(pool, 'sign-up/email', { email, password: 'a long passphrase', name: email })).status, 200);
    }
    await pool.query('update "user" set email_verified = true where email = $1', ['verified@example.com']);
    slow = true;
    held = await pool.connect();
    const floor = 2000;
    let completed = 0;
    const started = performance.now();
    const responses = ['unknown', 'verified', 'unverified'].map(kind => {
      const email = `${kind}@example.com`;
      let acquired = 0;
      return resendVerification({
        acquire: async () => { const client = await pool.connect(); acquired = performance.now(); return client; },
        limit: client => consumeIdentifierAttempt(client, 'verification-resend', email),
        send: async (client, queueDelivery) => (await post(client, 'send-verification-email', { email }, async () => { queueDelivery(deliver); })).ok,
        log: () => assert.fail('unexpected failure'),
      }, floor).then(value => { completed++; return { kind, value, elapsed: performance.now() - started, workElapsed: performance.now() - acquired }; });
    });
    await delay(600);
    assert.equal(pool.waitingCount, 3);
    held.release();
    held = undefined;
    await Promise.race([slowFinished, delay(3000)]);
    assert.equal(slowDone, true);
    const idleDeadline = performance.now() + 2000;
    while (!pool.idleCount && performance.now() < idleDeadline) await delay(10);
    assert.equal(pool.idleCount, 1);
    assert.equal(completed, 0);
    const before = performance.now();
    await pool.query('select 1');
    assert.ok(performance.now() - before < 150, 'padding must not hold the pool');
    const results = await Promise.all(responses);
    assert.equal(new Set(results.map(result => result.value)).size, 1);
    for (const result of results) assert.ok(result.elapsed >= 600 + floor - 50, `${result.kind}: ${result.elapsed}`);
    for (const result of results) assert.ok(result.workElapsed < floor + 250, `${result.kind}: ${result.workElapsed}`);
  } finally {
    held?.release();
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});

test('slow verification delivery does not block unrelated pool work and drains before acknowledgment', { timeout: 10000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  const namespace = `resend_mail_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}`, max: 1 });
  let unblock;
  const gate = new Promise(resolve => { unblock = resolve; });
  try {
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    await pool.query(await readFile('drizzle/0004_auth_identifier_rate_limit.sql', 'utf8'));
    let slow = false;
    let started;
    const mailStarted = new Promise(resolve => { started = resolve; });
    const deliver = async () => { if (slow) { started(); await gate; } };
    const auth = (client, sendVerification = deliver) => createAuth(drizzle(client), {
      baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification,
    });
    const post = (client, path, body, sendVerification) => auth(client, sendVerification).handler(new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body),
    }));
    const email = 'unverified@example.com';
    assert.equal((await post(pool, 'sign-up/email', { email, password: 'a long passphrase', name: email })).status, 200);
    slow = true;
    let acknowledged = false;
    const resend = resendVerification({
      acquire: () => pool.connect(),
      limit: client => consumeIdentifierAttempt(client, 'verification-resend', email),
      send: async (client, queueDelivery) => (await post(client, 'send-verification-email', { email }, async () => { queueDelivery(deliver); })).ok,
      log: () => assert.fail('unexpected failure'),
    }, 10).then(() => { acknowledged = true; });
    try {
      await Promise.race([mailStarted, delay(3000).then(() => { throw Error('delivery did not start'); })]);
      const queryCompleted = await Promise.race([pool.query('select 1').then(() => true), delay(200).then(() => false)]);
      assert.equal(queryCompleted, true, 'slow delivery must not exhaust shared pool');
      assert.equal(acknowledged, false, 'delivery must drain before acknowledgment');
    } finally {
      unblock();
      await resend;
    }
  } finally {
    unblock();
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});
