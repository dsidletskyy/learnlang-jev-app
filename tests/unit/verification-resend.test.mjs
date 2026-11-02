import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resendVerification } from '../../lib/verification-resend.ts';

test('resend acknowledges limits and safely logs operational failures', async () => {
  const logs = [];
  let sends = 0;
  const deps = { limit: async () => true, send: async () => { sends++; return true; }, log: message => logs.push(message) };
  const acknowledged = await resendVerification(deps, 1);
  assert.equal(sends, 1);
  assert.equal(await resendVerification({ ...deps, limit: async () => false }, 1), acknowledged);
  assert.equal(sends, 1);
  assert.equal(await resendVerification({ ...deps, send: async () => false }, 1), acknowledged);
  assert.equal(await resendVerification({ ...deps, limit: async () => { throw Error('secret link'); } }, 1), acknowledged);
  assert.equal(await resendVerification({ ...deps, send: async () => { throw Error('secret link'); } }, 1), acknowledged);
  assert.deepEqual(logs, Array(3).fill('Verification resend unavailable'));
});

test('resend returns at one bounded deadline even when delivery stalls or fails late', async () => {
  const deadline = 80;
  const logs = [];
  for (const send of [async () => true, async () => { await new Promise(r => setTimeout(r, 30)); return true; }, async () => { await new Promise(r => setTimeout(r, 200)); throw Error('secret'); }, () => new Promise(() => {})]) {
    const start = performance.now();
    const result = await resendVerification({ limit: async () => true, send, log: message => logs.push(message) }, deadline);
    const elapsed = performance.now() - start;
    assert.equal(result, 'If verification is needed, a link will be sent to the local inbox.');
    assert.ok(elapsed >= 65 && elapsed < 180, `elapsed ${elapsed}`);
  }
  await new Promise(r => setTimeout(r, 150));
  assert.deepEqual(logs, ['Verification resend unavailable']);
});

test('resend does not start delivery after rate-limit check misses deadline', async () => {
  let sent = false;
  await resendVerification({ limit: async () => { await new Promise(r => setTimeout(r, 100)); return true; }, send: async () => { sent = true; return true; }, log: () => {} }, 30);
  await new Promise(r => setTimeout(r, 110));
  assert.equal(sent, false);
});
