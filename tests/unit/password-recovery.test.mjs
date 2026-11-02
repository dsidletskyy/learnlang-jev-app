import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateResetPassword } from '../../lib/password-recovery-policy.ts';

test('reset validation fails closed and permits retries', async () => {
  let calls = 0;
  const allowed = async () => { calls++; return 'allowed'; };
  assert.equal(await validateResetPassword('short', 'short', allowed), 'password');
  assert.equal(await validateResetPassword('a long password', 'different password', allowed), 'confirmation');
  assert.equal(calls, 0);
  assert.equal(await validateResetPassword('a long password', 'a long password', async () => 'blocked'), 'password');
  assert.equal(await validateResetPassword('a long password', 'a long password', async () => 'unavailable'), 'retry');
  assert.equal(await validateResetPassword('a long password', 'a long password', allowed), 'valid');
});
