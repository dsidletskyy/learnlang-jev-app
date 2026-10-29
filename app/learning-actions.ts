'use server';

import { eq } from 'drizzle-orm';
import { getDatabase } from '../db';
import { dictionaryEntries } from '../db/schema';
import { languages } from '../lib/dictionary-entry';

export async function loadSessionEntries(language: unknown) {
  if (!process.env.TYPESAFE_API_KEY?.trim() || typeof language !== 'string' || !languages.some(item => item.code === language)) {
    return { ok: false as const };
  }
  try {
    const db = await getDatabase();
    const entries = await db.select({ id: dictionaryEntries.id, original: dictionaryEntries.original, translation: dictionaryEntries.translation, language: dictionaryEntries.language }).from(dictionaryEntries).where(eq(dictionaryEntries.language, language));
    return { ok: true as const, entries };
  } catch {
    return { ok: false as const };
  }
}
