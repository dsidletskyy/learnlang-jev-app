import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('local inbox publishes SMTP and web UI on loopback only', () => {
  const result = spawnSync('docker', ['compose', '-f', 'compose.yaml', 'config', '--format', 'json'], {
    encoding: 'utf8', env: { ...process.env, POSTGRES_PASSWORD: 'test-config-only' },
  });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  const inbox = config.services.inbox;
  assert.ok(inbox, 'local inbox service is configured');
  assert.deepEqual(inbox.ports.map(({ host_ip, published, target }) => ({ host_ip, published, target })), [
    { host_ip: '127.0.0.1', published: '1025', target: 1025 },
    { host_ip: '127.0.0.1', published: '8025', target: 8025 },
  ]);
});
