import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './schema' && context.parentURL?.endsWith('/db/dictionary-owner-access.ts')) {
      return nextResolve('./schema.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
const { dictionaryForOwner } = await import('../../db/dictionary-owner-access.ts');

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

test('dictionary access isolates owners and treats unowned and foreign entries as missing', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl, 'dedicated test database required');
  const client = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    const identity = await client.query('select current_database() as db, current_user as username');
    assert.deepEqual(identity.rows[0], { db: 'language_test', username: 'language_test' });
    await client.query('begin');
    await client.query('create schema dictionary_owner_access_test');
    await client.query('set local search_path to dictionary_owner_access_test');
    await client.query(await readFile('drizzle/0001_dictionary_entries.sql', 'utf8'));
    await client.query(await readFile('drizzle/0002_dictionary_entry_owner.sql', 'utf8'));
    const db = drizzle(client);
    assert.throws(() => dictionaryForOwner(db, ''), /owner/i);
    const alice = dictionaryForOwner(db, 'alice');
    const bob = dictionaryForOwner(db, 'bob');
    const own = await alice.create({ original: 'hello', language: 'en', translation: 'hi', ownerId: 'bob' });
    const foreign = await bob.create({ original: 'hallo', language: 'de', translation: 'hello' });
    const legacy = await client.query("insert into dictionary_entries (original, language, translation) values ('legacy', 'en', 'old') returning id");
    const missing = 2147483647;
    assert.deepEqual((await alice.list()).map(entry => entry.id), [own.id]);
    assert.deepEqual((await bob.list()).map(entry => entry.id), [foreign.id]);
    assert.deepEqual((await alice.listByLanguage('en')).map(entry => entry.id), [own.id]);
    assert.deepEqual(await alice.listByLanguage('de'), []);
    assert.equal((await alice.findById(own.id)).original, 'hello');
    for (const id of [foreign.id, legacy.rows[0].id, missing]) {
      assert.equal(await alice.findById(id), undefined);
      assert.equal(await alice.update(id, { original: 'changed', language: 'en', translation: 'changed', ownerId: 'alice' }), false);
      assert.equal(await alice.remove(id), false);
    }
    assert.equal(await alice.update(own.id, { original: 'updated', language: 'de', translation: 'yes', ownerId: 'bob' }), true);
    assert.equal((await alice.findById(own.id)).original, 'updated');
    assert.equal(await bob.findById(own.id), undefined);
    assert.equal(await alice.remove(own.id), true);
    assert.equal(await alice.remove(own.id), false);
    assert.equal((await bob.findById(foreign.id)).original, 'hallo');
    assert.equal((await client.query('select owner_id from dictionary_entries where id = $1', [legacy.rows[0].id])).rows[0].owner_id, null);
  } finally {
    await client.query('rollback');
    await client.end();
  }
});
