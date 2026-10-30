import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

for (const config of ['playwright.config.ts', 'playwright.learning.config.ts', 'playwright.unavailable.config.ts']) {
  test(`${config} lists tests only for Chromium`, () => {
    const output = execFileSync('pnpm', ['exec', 'playwright', 'test', '--config', config, '--list', '--reporter=json'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        TEST_DATABASE_URL: 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test',
        JEV_TEST_URL: 'http://127.0.0.1:3101',
      },
    });
    const inventory = JSON.parse(output);
    assert.deepEqual(inventory.config.projects.map((project) => project.name), ['chromium']);
    assert.ok(inventory.suites.length > 0, 'suite must contain tests');
  });
}
