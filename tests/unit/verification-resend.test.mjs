import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resendVerification } from '../../lib/verification-resend.ts';

test('resend acknowledges limits and safely logs operational failures', async () => {
  const logs = [];
  let sends = 0;
  const deps = { limit: async () => true, send: async () => { sends++; return true; }, log: message => logs.push(message) };
  const acknowledged = await resendVerification(deps);
  assert.equal(sends, 1);
  assert.equal(await resendVerification({ ...deps, limit: async () => false }), acknowledged);
  assert.equal(sends, 1);
  assert.equal(await resendVerification({ ...deps, send: async () => false }), acknowledged);
  assert.equal(await resendVerification({ ...deps, limit: async () => { throw Error('secret link'); } }), acknowledged);
  assert.equal(await resendVerification({ ...deps, send: async () => { throw Error('secret link'); } }), acknowledged);
  assert.deepEqual(logs, Array(3).fill('Verification resend unavailable'));
});
