import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { assignLegacyEntries } from '../../scripts/assign-legacy-entries.mjs';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === './schema' && context.parentURL?.endsWith('/db/dictionary-owner-access.ts')) return next('./schema.ts', context);
  return next(specifier, context);
} });
const { dictionaryForOwner } = await import('../../db/dictionary-owner-access.ts');

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

test('legacy assignment preserves migration data, validates accounts, rolls back, retries and resolves races', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
  await admin.connect();
  const namespace = `assignment_${randomUUID().replaceAll('-', '')}`;
  let pool;
  try {
    assert.deepEqual((await admin.query('select current_database() as db, current_user as username')).rows[0], { db: 'language_test', username: 'language_test' });
    await admin.query(`create schema "${namespace}"`);
    pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
    await pool.query(await readFile('drizzle/0001_dictionary_entries.sql', 'utf8'));
    await pool.query("insert into dictionary_entries (original, language, translation) values ('bonjour', 'French', 'hello'), ('salut', 'French', 'hi')");
    await pool.query(await readFile('drizzle/0002_dictionary_entry_owner.sql', 'utf8'));
    await pool.query((await readFile('drizzle/0003_better_auth.sql', 'utf8')).replaceAll('"public".', `"${namespace}".`));
    await pool.query(`insert into "user" (id, name, email, email_verified) values ('a','A','a@example.com',true), ('b','B','b@example.com',true), ('unverified','U','u@example.com',false)`);
    await pool.query("insert into dictionary_entries (original, language, translation, owner_id) values ('owned', 'English', 'owned', 'b')");
    const entries = async () => (await pool.query('select original, language, translation, owner_id from dictionary_entries order by id')).rows;
    const alice = dictionaryForOwner(drizzle(pool), 'a');
    const bob = dictionaryForOwner(drizzle(pool), 'b');
    assert.deepEqual(await alice.list(), []);
    assert.deepEqual((await bob.list()).map(entry => entry.original), ['owned']);
    const normal = await alice.create({ original: 'new', language: 'German', translation: 'new' });
    assert.equal((await alice.listByLanguage('German'))[0].id, normal.id);
    const before = await entries();
    assert.deepEqual(before[0], { original: 'bonjour', language: 'French', translation: 'hello', owner_id: null });
    for (const id of ['missing', 'unverified', '']) await assert.rejects(assignLegacyEntries(pool, id));
    assert.deepEqual(await entries(), before);
    await pool.query(`create function reject_assignment() returns trigger language plpgsql as $$ begin if new.original = 'salut' then raise exception 'injected failure'; end if; return new; end $$`);
    await pool.query('create trigger reject_assignment before update on dictionary_entries for each row execute function reject_assignment()');
    await assert.rejects(assignLegacyEntries(pool, 'a'));
    assert.deepEqual(await entries(), before);
    await pool.query('drop trigger reject_assignment on dictionary_entries');
    await pool.query(`create function delay_assignment() returns trigger language plpgsql as $$ begin perform pg_sleep(0.1); return new; end $$`);
    await pool.query('create trigger delay_assignment before update on dictionary_entries for each row execute function delay_assignment()');
    const counts = await Promise.all([assignLegacyEntries(pool, 'a'), assignLegacyEntries(pool, 'b')]);
    assert.deepEqual([...counts].sort(), [0, 2]);
    const after = await entries();
    assert.equal(after[0].owner_id, after[1].owner_id);
    assert.ok(['a', 'b'].includes(after[0].owner_id));
    assert.deepEqual(after.slice(2), before.slice(2));
    const winner = after[0].owner_id === 'a' ? alice : bob;
    const loser = after[0].owner_id === 'a' ? bob : alice;
    assert.deepEqual((await winner.listByLanguage('French')).map(entry => entry.original).sort(), ['bonjour', 'salut']);
    assert.deepEqual(await loser.listByLanguage('French'), []);
    assert.equal(await assignLegacyEntries(pool, 'a'), 0);
    assert.deepEqual(await entries(), after);
  } finally {
    if (pool) await pool.end();
    await admin.query(`drop schema if exists "${namespace}" cascade`);
    await admin.end();
  }
});
