import assert from 'node:assert/strict';
import { test } from 'node:test';
import { revokeCurrentSession } from '../../lib/sign-out.ts';

test('sign-out clears cookie only after successful revocation', async () => {
  let cleared = 0;
  assert.equal(await revokeCurrentSession(async () => false, () => { cleared++; }), false);
  assert.equal(await revokeCurrentSession(async () => { throw new Error('database unavailable'); }, () => { cleared++; }), false);
  assert.equal(cleared, 0);
  assert.equal(await revokeCurrentSession(async () => true, () => { cleared++; }), true);
  assert.equal(cleared, 1);
});
