import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

test('database run lock rejects conflicts and releases after termination', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'test-run-lock-'));
  const env = { ...process.env };
  const lockPath = join(dir, 'lock');
  const args = ['scripts/test-lock.py', '--lock-path', lockPath, process.execPath, '-e', 'console.log("ready"); setInterval(() => {}, 1000)'];
  const holder = spawn('python3', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const [chunk] = await Promise.race([once(holder.stdout, 'data'), once(holder, 'exit').then(() => { throw new Error('lock exited before ready'); })]);
    assert.match(String(chunk), /ready/);
    const conflict = spawnSync('python3', ['scripts/test-lock.py', '--lock-path', lockPath, process.execPath, '-e', ''], { env, encoding: 'utf8' });
    assert.notEqual(conflict.status, 0);
    assert.match(conflict.stderr, /another database test run/);
    holder.kill('SIGTERM');
    await once(holder, 'exit');
    const next = spawnSync('python3', ['scripts/test-lock.py', '--lock-path', lockPath, process.execPath, '-e', ''], { env, encoding: 'utf8' });
    assert.equal(next.status, 0, next.stderr);
  } finally {
    holder.kill('SIGKILL');
    rmSync(dir, { recursive: true, force: true });
  }
});

test('database run lock releases after command failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'test-run-lock-'));
  const args = ['scripts/test-lock.py', '--lock-path', join(dir, 'lock'), process.execPath, '-e'];
  try {
    const failed = spawnSync('python3', [...args, 'process.exit(7)'], { encoding: 'utf8' });
    assert.equal(failed.status, 7);
    const next = spawnSync('python3', [...args, ''], { encoding: 'utf8' });
    assert.equal(next.status, 0, next.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
