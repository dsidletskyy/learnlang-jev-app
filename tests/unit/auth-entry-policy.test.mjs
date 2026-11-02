import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register, signIn } from '../../lib/auth-entry-policy.ts';

const inputs = { email: 'person@example.com', password: 'a long passphrase' };
test('registration fails closed on unavailable blocklist and limits before provider', async () => {
  let calls = 0;
  const deps = { limit: async () => true, blocklist: async () => 'unavailable', provider: async () => { calls++; return true; } };
  assert.equal(await register(inputs, deps), 'retry');
  assert.equal(calls, 0);
  assert.equal(await register(inputs, { ...deps, limit: async () => false }), 'acknowledged');
  assert.equal(calls, 0);
});
test('registration hides provider outcome and sign-in does not consult blocklist', async () => {
  const deps = { limit: async () => true, blocklist: async () => 'allowed', provider: async () => false };
  assert.equal(await register(inputs, deps), 'acknowledged');
  assert.equal(await signIn(inputs, deps), false);
  assert.equal(await signIn(inputs, { ...deps, provider: async () => true, blocklist: async () => { throw Error(); } }), true);
});
