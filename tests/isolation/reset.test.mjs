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

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

function resetWithDockerOutput(output) {
  const dir = mkdtempSync(join(tmpdir(), 'reset-safety-'));
  try {
    writeFileSync(join(dir, 'docker'), `#!/bin/sh\n${output}\n`, { mode: 0o755 });
    return spawnSync(process.execPath, ['tests/isolation/reset.mjs'], {
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, TEST_DATABASE_URL: testUrl }, encoding: 'utf8',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('reset refuses an unavailable dedicated container', () => {
  const result = resetWithDockerOutput('exit 0');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Dedicated test container is unavailable/);
});

test('reset refuses an unrecognized container before connecting', () => {
  const result = resetWithDockerOutput(`if [ "$1" = compose ]; then echo fake-id; else echo '[{"State":{"Running":true},"Config":{"Labels":{"com.docker.compose.project":"personal"}},"NetworkSettings":{"Ports":{"5432/tcp":[{"HostIp":"127.0.0.1","HostPort":"55432"}]}},"Mounts":[]}]'; fi`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unrecognized dedicated test container/);
});
