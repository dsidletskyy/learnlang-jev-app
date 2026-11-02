import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
if (process.env.TEST_DATABASE_URL !== testUrl) {
  throw new Error('TEST_DATABASE_URL must explicitly match the dedicated test database');
}

const client = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
await client.connect();
try {
  const { rows } = await client.query('select current_database() as db, current_user as username');
  assert.deepEqual(rows[0], { db: 'language_test', username: 'language_test' });
  await client.query('begin');
  await client.query('create schema ownership_migration_test');
  await client.query('set local search_path to ownership_migration_test');
  await client.query(await readFile('drizzle/0001_dictionary_entries.sql', 'utf8'));
  await client.query("insert into dictionary_entries (original, language, translation) values ('bonjour', 'French', 'hello')");
  await client.query(await readFile('drizzle/0002_dictionary_entry_owner.sql', 'utf8'));
  const result = await client.query('select original, language, translation, owner_id from dictionary_entries');
  assert.deepEqual(result.rows, [{ original: 'bonjour', language: 'French', translation: 'hello', owner_id: null }]);
  console.log('Legacy dictionary entry preserved without an owner.');
} finally {
  await client.query('rollback');
  await client.end();
}
