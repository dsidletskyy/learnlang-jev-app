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

test('recovery acknowledgment waits for floor for known, unknown, throttled and failed requests', async () => {
  const { recoveryAcknowledgment } = await import('../../lib/password-recovery-policy.ts');
  for (const outcome of ['known', 'unknown', 'throttled', 'failed']) {
    let now = 100;
    const waits = [];
    const response = await recoveryAcknowledgment(async () => {
      now += outcome === 'known' ? 3000 : 10;
      if (outcome === 'failed') throw Error('secret');
    }, () => now, async ms => { waits.push(ms); now += ms; }, () => {});
    assert.equal(response, outcome === 'failed' ? 'Password recovery is temporarily unavailable. Please try again later.' : 'If recovery is available, a link will be sent to the local inbox.');
    assert.equal(now, 10100);
    assert.equal(waits.length, 1);
  }
});
