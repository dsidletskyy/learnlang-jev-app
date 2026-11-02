import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

const stubs = {
  '../lib/protected-dictionary': `export const protectedDictionary = () => globalThis.protectedDictionary();`,
  '../lib/meaning-match': `export const scoreMeaningMatch = (...args) => globalThis.scoreMeaningMatch(...args);`,
  'next/cache': `export const revalidatePath = () => {};`,
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (stubs[specifier] && context.parentURL?.includes('/app/')) return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
  if (specifier === '../lib/dictionary-entry' && context.parentURL?.includes('/app/')) return nextResolve('../lib/dictionary-entry.ts', context);
  return nextResolve(specifier, context);
} });
const { addDictionaryEntry, editDictionaryEntry, deleteDictionaryEntry } = await import('../../app/dictionary-actions.ts');
const { loadSessionEntries } = await import('../../app/learning-actions.ts');
const { evaluateMeaningMatch } = await import('../../app/meaning-match-actions.ts');
const fields = { original: 'hello', translation: 'hi', language: 'en' };

test('protected actions fail closed without a validated session', async () => {
  globalThis.protectedDictionary = async () => null;
  globalThis.scoreMeaningMatch = () => { throw new Error('provider called'); };
  for (const result of await Promise.all([
    addDictionaryEntry(fields), editDictionaryEntry(1, fields), deleteDictionaryEntry(1),
    loadSessionEntries('en'), evaluateMeaningMatch({ id: 1, answer: 'hi' }),
  ])) {
    assert.equal(result.ok, false);
    assert.match(result.error, /sign in/i);
  }
});

test('scoring loads owned entry and rejects forged or missing entries before provider', async () => {
  process.env.TYPESAFE_API_KEY = 'test';
  let calls = 0;
  globalThis.protectedDictionary = async () => ({ findById: async id => id === 1 ? fields : undefined });
  globalThis.scoreMeaningMatch = async task => { calls++; assert.deepEqual(task, { original: 'hello', language: 'en', answer: 'hi' }); return 100; };
  assert.equal((await evaluateMeaningMatch({ id: 1, answer: 'hi' })).score, 100);
  for (const input of [{ id: 2, answer: 'hi' }, { id: 1, answer: 'hi', original: 'forged' }, { id: 1, answer: 'hi', ownerId: 'bob' }]) {
    assert.equal((await evaluateMeaningMatch(input)).ok, false);
  }
  assert.equal(calls, 1);
});

test('dictionary and learning actions use scoped access and ignore supplied ownership', async () => {
  const calls = [];
  globalThis.protectedDictionary = async () => ({
    create: async input => calls.push(['create', input]),
    update: async (id, input) => { calls.push(['update', id, input]); return false; },
    remove: async id => { calls.push(['remove', id]); return false; },
    listByLanguage: async language => { calls.push(['list', language]); return [{ id: 1, ...fields, ownerId: 'alice' }]; },
  });
  assert.equal((await addDictionaryEntry({ ...fields, ownerId: 'bob' })).ok, true);
  const foreign = await editDictionaryEntry(2, fields);
  const missing = await editDictionaryEntry(3, fields);
  assert.deepEqual(foreign, missing);
  assert.deepEqual(await deleteDictionaryEntry(2), await deleteDictionaryEntry(3));
  assert.deepEqual((await loadSessionEntries('en')).entries, [{ id: 1, ...fields }]);
  assert.deepEqual(calls[0], ['create', fields]);
});
