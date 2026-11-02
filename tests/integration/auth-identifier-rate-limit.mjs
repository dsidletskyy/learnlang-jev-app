import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import pg from 'pg';
import { consumeIdentifierAttempt } from '../../lib/auth-identifier-rate-limit.ts';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
test('identifier limits are atomic, operation-specific, normalized, and expire', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl });
  await admin.connect();
  const namespace = `auth_limit_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  try {
    await pool.query(await readFile('drizzle/0004_auth_identifier_rate_limit.sql', 'utf8'));
    const attempts = await Promise.all(Array.from({ length: 10 }, () => consumeIdentifierAttempt(pool, 'sign-in', 'Person@Example.com')));
    assert.equal(attempts.filter(Boolean).length, 5);
    assert.equal(await consumeIdentifierAttempt(pool, 'sign-in', 'person@example.com'), false);
    assert.equal(await consumeIdentifierAttempt(pool, 'sign-in', 'unknown@example.com'), true);
    for (const operation of ['registration', 'verification-resend', 'reset']) {
      assert.deepEqual(await Promise.all(Array.from({ length: 4 }, () => consumeIdentifierAttempt(pool, operation, 'person@example.com'))).then(a => a.filter(Boolean).length), 3);
    }
    await pool.query("update auth_identifier_rate_limit set attempts = ARRAY[now() - interval '15 minutes', now() - interval '14 minutes', now() - interval '14 minutes', now() - interval '14 minutes', now() - interval '14 minutes'] where operation = 'sign-in' and cardinality(attempts) = 5");
    assert.equal(await consumeIdentifierAttempt(pool, 'sign-in', 'person@example.com'), true);
    assert.equal(await consumeIdentifierAttempt(pool, 'sign-in', 'person@example.com'), false);
    await pool.query("update auth_identifier_rate_limit set attempts = ARRAY[now() - interval '15 minutes']");
    assert.equal(await consumeIdentifierAttempt(pool, 'sign-in', 'person@example.com'), true);
    await pool.query('drop table auth_identifier_rate_limit');
    await assert.rejects(consumeIdentifierAttempt(pool, 'sign-in', 'person@example.com'), /rate limit unavailable/i);
  } finally {
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});
