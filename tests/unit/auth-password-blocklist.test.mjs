import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPasswordBlocklist } from '../../lib/auth-password-blocklist.ts';

test('versioned local blocklist rejects common passwords without changing passphrases', async () => {
  assert.equal(await checkPasswordBlocklist('123456789012'), 'blocked');
  assert.equal(await checkPasswordBlocklist('a unique 🐧 passphrase with spaces'), 'allowed');
});

test('missing or corrupt blocklist fails closed', async () => {
  assert.equal(await checkPasswordBlocklist('any passphrase', async () => { throw new Error('missing'); }), 'unavailable');
  assert.equal(await checkPasswordBlocklist('any passphrase', async () => 'password123\n'), 'unavailable');
});
