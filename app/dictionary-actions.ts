'use server';

import { revalidatePath } from 'next/cache';
import { getDatabase } from '../db';
import { dictionaryEntries } from '../db/schema';
import { dictionaryEntrySchema } from '../lib/dictionary-entry';

export async function addDictionaryEntry(input: unknown) {
  const parsed = dictionaryEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Check the fields and try again.' };
  try {
    const db = await getDatabase();
    await db.insert(dictionaryEntries).values(parsed.data);
  } catch {
    return { ok: false as const, error: 'Could not save phrase. Check the database and try again.' };
  }
  revalidatePath('/');
  return { ok: true as const };
}
