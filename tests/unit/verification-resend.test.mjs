import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resendVerification } from '../../lib/verification-resend.ts';

test('resend acknowledges limits and safely logs operational failures', async () => {
  const logs = [];
  let sends = 0;
  const deps = { acquire: async () => ({ query: async () => {}, release: () => {} }), limit: async () => true, send: async () => { sends++; return true; }, log: message => logs.push(message) };
  const acknowledged = await resendVerification(deps, 1);
  assert.equal(sends, 1);
  assert.equal(await resendVerification({ ...deps, limit: async () => false }, 1), acknowledged);
  assert.equal(sends, 1);
  assert.equal(await resendVerification({ ...deps, send: async () => false }, 1), acknowledged);
  assert.equal(await resendVerification({ ...deps, limit: async () => { throw Error('secret link'); } }, 1), acknowledged);
  assert.equal(await resendVerification({ ...deps, send: async () => { throw Error('secret link'); } }, 1), acknowledged);
  assert.deepEqual(logs, Array(3).fill('Verification resend unavailable'));
});

for (const stalled of ['limit', 'send']) {
  test(`resend waits for stalled ${stalled} to drain before responding`, async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let response = false;
    let sends = 0;
    const work = resendVerification({
      acquire: async () => ({ query: async () => {}, release: () => {} }),
      limit: async () => { if (stalled === 'limit') await gate; return true; },
      send: async () => { sends++; if (stalled === 'send') await gate; return true; },
      log: () => {},
    }, 10).then(() => { response = true; });
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(response, false);
    release();
    await work;
    assert.equal(sends, 1);
    assert.equal(response, true);
  });
}

test('resend resets and releases connections before padding, discarding failed resets', async () => {
  for (const failReset of [false, true]) {
    const queries = [];
    let released;
    const work = resendVerification({
      acquire: async () => ({
        query: async sql => { queries.push(sql); if (failReset && sql === 'RESET lock_timeout') throw Error('reset failed'); },
        release: broken => { released = broken; },
      }),
      limit: async () => false,
      send: async () => { assert.fail('limited request sent'); },
      log: () => {},
    }, 100);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(released, failReset);
    assert.deepEqual(queries, failReset
      ? ["SET lock_timeout = '200ms'", "SET statement_timeout = '200ms'", 'RESET lock_timeout']
      : ["SET lock_timeout = '200ms'", "SET statement_timeout = '200ms'", 'RESET lock_timeout', 'RESET statement_timeout']);
    await work;
  }
});
