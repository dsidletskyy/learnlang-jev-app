'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
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

export async function deleteDictionaryEntry(input: unknown) {
  const parsed = z.number().int().positive().max(2147483647).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Could not delete phrase. Try again.' };
  try {
    const db = await getDatabase();
    const deleted = await db.delete(dictionaryEntries).where(eq(dictionaryEntries.id, parsed.data)).returning({ id: dictionaryEntries.id });
    revalidatePath('/');
    return { ok: true as const, deleted: deleted.length > 0 };
  } catch {
    return { ok: false as const, error: 'Could not delete phrase. Check the database and try again.' };
  }
}
