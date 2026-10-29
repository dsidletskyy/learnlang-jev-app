import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('reset refuses missing and personal database URLs without connecting', () => {
  for (const url of ['', 'postgresql://language_learning:password@127.0.0.1:54329/language_learning']) {
    const result = spawnSync('node', ['tests/isolation/reset.mjs'], {
      env: { ...process.env, TEST_DATABASE_URL: url }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TEST_DATABASE_URL must explicitly match the dedicated test database/);
  }
});
