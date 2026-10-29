import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const guard = '--require=./tests/isolation/network-guard.cjs';
test('test app rejects missing or remote Jev substitute configuration', () => {
  for (const url of ['', 'https://api.typesafe.ai']) {
    const result = spawnSync('node', ['-e', ''], { env: { ...process.env, NODE_OPTIONS: guard, JEV_TEST_URL: url }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /JEV_TEST_URL must be the loopback test substitute/);
  }
});
test('test app blocks outbound connections even with valid substitute configuration', () => {
  const result = spawnSync('node', ['-e', "require('node:net').connect(443, 'api.typesafe.ai')"], {
    env: { ...process.env, NODE_OPTIONS: guard, JEV_TEST_URL: 'http://127.0.0.1:3101' }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Outbound network blocked in browser tests/);
});
test('test app blocks outbound fetch requests', () => {
  const result = spawnSync('node', ['-e', "fetch('https://api.typesafe.ai').catch(e => { console.error(e.cause); process.exit(1) })"], {
    env: { ...process.env, NODE_OPTIONS: guard, JEV_TEST_URL: 'http://127.0.0.1:3101' }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Outbound network blocked in browser tests/);
});
