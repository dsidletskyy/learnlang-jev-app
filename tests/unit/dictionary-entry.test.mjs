import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dictionaryEntrySchema } from '../../lib/dictionary-entry.ts';

test('untrusted dictionary input is trimmed, bounded by code points and restricted to supported languages', () => {
  const valid = { original: `  ${'😀'.repeat(2000)}  `, language: 'uk', translation: '  translation\nline  ' };
  const result = dictionaryEntrySchema.parse(valid);
  assert.equal(result.original, '😀'.repeat(2000));
  assert.equal(result.translation, 'translation\nline');
  assert.equal(dictionaryEntrySchema.safeParse({ ...valid, original: '😀'.repeat(2001) }).success, false);
  assert.equal(dictionaryEntrySchema.safeParse({ ...valid, translation: '  ' }).success, false);
  assert.equal(dictionaryEntrySchema.safeParse({ ...valid, language: 'fr' }).success, false);
  assert.equal(dictionaryEntrySchema.safeParse({ ...valid, original: null }).success, false);
});
