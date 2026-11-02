'use server';

import { languages } from '../lib/dictionary-entry';
import { protectedDictionary } from '../lib/protected-dictionary';

export async function loadSessionEntries(language: unknown) {
  const dictionary = await protectedDictionary();
  if (!dictionary) return { ok: false as const, error: 'Session expired or unavailable. Sign in again.' };
  if (!process.env.TYPESAFE_API_KEY?.trim() || typeof language !== 'string' || !languages.some(item => item.code === language)) {
    return { ok: false as const, error: 'Could not load entries. Check the database and try again.' };
  }
  try {
    const entries = await dictionary.listByLanguage(language);
    return { ok: true as const, entries: entries.map(({ id, original, translation, language }) => ({ id, original, translation, language })) };
  } catch {
    return { ok: false as const, error: 'Could not load entries. Check the database and try again.' };
  }
}
