import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('database integration test refuses a personal or missing connection', () => {
  for (const url of ['', 'postgresql://language_learning:password@127.0.0.1:54329/language_learning']) {
    const result = spawnSync('node', ['tests/integration/database.mjs'], {
      env: { ...process.env, TEST_DATABASE_URL: url },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('TEST_DATABASE_URL must explicitly match the dedicated test database');
  }
});
