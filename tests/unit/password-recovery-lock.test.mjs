import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withIdentifierLock } from '../../lib/password-recovery.ts';

test('withIdentifierLock discards client when rollback fails', async () => {
  const failure = new Error('work failed');
  let released;
  const client = {
    query: async sql => { if (sql === 'ROLLBACK') throw new Error('connection lost'); },
    release: destroy => { released = destroy; },
  };
  await assert.rejects(withIdentifierLock({ connect: async () => client }, 'person@example.com', async () => { throw failure; }), error => error === failure);
  assert.equal(released, true);
});
