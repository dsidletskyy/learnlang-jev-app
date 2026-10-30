import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('failed attempt leaves an entry that its retry does not see', () => {
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', '--config=playwright.retry.config.ts', '--reporter=json'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: '' },
  });
  assert.equal(run.status, 0, `Retry probe failed: ${run.stderr}\n${run.stdout}`);
  const report = JSON.parse(run.stdout);
  assert.equal(report.stats.expected, 0);
  assert.equal(report.stats.unexpected, 0);
  assert.equal(report.stats.skipped, 0);
  assert.equal(report.stats.flaky, 1);
  const result = report.suites[0].specs[0].tests[0];
  assert.deepEqual(result.results.map((attempt) => attempt.status), ['failed', 'passed']);
  assert.match(result.results[0].error.message, /Intentional first-attempt failure to verify retry isolation/);
});
