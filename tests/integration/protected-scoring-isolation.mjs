import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === '../lib/protected-dictionary' && context.parentURL?.endsWith('/app/meaning-match-actions.ts')) return { url: 'data:text/javascript,export const protectedDictionary = () => globalThis.testDictionary()', shortCircuit: true };
  if (specifier === '../lib/dictionary-entry' || specifier === '../lib/meaning-match') return next(`${specifier}.ts`, context);
  if (specifier === './schema' && context.parentURL?.endsWith('/db/dictionary-owner-access.ts')) return next('./schema.ts', context);
  if (specifier === '../db/schema' && context.parentURL?.endsWith('/lib/auth.ts')) return next('../db/schema.ts', context);
  if (specifier === './session-cookie' && context.parentURL?.endsWith('/lib/auth.ts')) return next('./session-cookie.ts', context);
  if (['./auth-configuration', './verification-mail'].includes(specifier) && context.parentURL?.endsWith('/lib/auth.ts')) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { createAuth, validatedSession } = await import('../../lib/auth.ts');
const { dictionaryForOwner } = await import('../../db/dictionary-owner-access.ts');
const { evaluateMeaningMatch } = await import('../../app/meaning-match-actions.ts');
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';

test('real accounts cannot score foreign or legacy entries or forge provider data', async () => {
  assert.equal(process.env.TEST_DATABASE_URL, testUrl);
  const admin = new pg.Client({ connectionString: testUrl, connectionTimeoutMillis: 3000 });
  await admin.connect();
  assert.deepEqual((await admin.query('select current_database() as db, current_user as username')).rows[0], { db: 'language_test', username: 'language_test' });
  const namespace = `scoring_isolation_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`create schema "${namespace}"`);
  const pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${namespace}` });
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { requests.push(JSON.parse(body)); res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ answers: { meaning: { type: 'score', score: 1, probabilities: [0, 1, 0], confidence: 1 } } })); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const previous = { key: process.env.TYPESAFE_API_KEY, url: process.env.JEV_TEST_URL };
  try {
    for (const file of ['0001_dictionary_entries.sql', '0002_dictionary_entry_owner.sql', '0003_better_auth.sql']) {
      await pool.query((await readFile(`drizzle/${file}`, 'utf8')).replaceAll('"public".', `"${namespace}".`));
    }
    const db = drizzle(pool);
    const links = new Map();
    const auth = createAuth(db, { baseURL: 'http://localhost:3000', secret: 'test-secret-for-better-auth-persistence-only', sendVerification: async (email, url) => links.set(email, url) });
    const post = (path, body) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' }, body: JSON.stringify(body) }));
    const sessions = [];
    for (const email of ['alice@example.com', 'bob@example.com']) {
      const credentials = { email, password: 'a long passphrase', name: email };
      assert.equal((await post('sign-up/email', credentials)).status, 200);
      assert.equal((await auth.handler(new Request(links.get(email)))).status, 302);
      const signin = await post('sign-in/email', credentials);
      assert.equal(signin.status, 200);
      const headers = new Headers({ cookie: signin.headers.get('set-cookie').split(';')[0] });
      const session = await validatedSession(auth, headers);
      assert.ok(session);
      sessions.push({ headers, session });
    }
    const alice = dictionaryForOwner(db, sessions[0].session.user.id);
    const bob = dictionaryForOwner(db, sessions[1].session.user.id);
    const own = await alice.create({ original: 'Alice original', language: 'en', translation: 'Alice translation' });
    const foreign = await bob.create({ original: 'Bob secret', language: 'de', translation: 'Bob translation' });
    const legacy = (await pool.query("insert into dictionary_entries (original, language, translation) values ('Legacy secret', 'en', 'old') returning id")).rows[0].id;
    process.env.TYPESAFE_API_KEY = 'test-key';
    process.env.JEV_TEST_URL = `http://127.0.0.1:${server.address().port}`;
    globalThis.testDictionary = async () => {
      const session = await validatedSession(auth, sessions[0].headers);
      return session ? dictionaryForOwner(db, session.user.id) : null;
    };
    const missing = await evaluateMeaningMatch({ id: 2147483647, answer: 'answer' });
    for (const id of [foreign.id, legacy]) assert.deepEqual(await evaluateMeaningMatch({ id, answer: 'answer' }), missing);
    for (const extra of [{ original: 'forged' }, { language: 'de' }, { ownerId: sessions[1].session.user.id }]) assert.equal((await evaluateMeaningMatch({ id: own.id, answer: 'answer', ...extra })).ok, false);
    assert.equal(requests.length, 0);
    assert.equal((await evaluateMeaningMatch({ id: own.id, answer: 'answer' })).ok, true);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].state, { original: 'Alice original', language: 'en', answer: 'answer' });
    await pool.query('delete from session where user_id = $1', [sessions[0].session.user.id]);
    assert.match((await evaluateMeaningMatch({ id: own.id, answer: 'answer' })).error, /sign in/i);
    assert.equal(requests.length, 1);
  } finally {
    if (previous.key === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = previous.key;
    if (previous.url === undefined) delete process.env.JEV_TEST_URL; else process.env.JEV_TEST_URL = previous.url;
    await new Promise(resolve => server.close(resolve));
    await pool.end();
    await admin.query(`drop schema "${namespace}" cascade`);
    await admin.end();
  }
});
