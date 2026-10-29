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

export async function editDictionaryEntry(id: unknown, input: unknown) {
  const parsedId = z.number().int().positive().max(2147483647).safeParse(id);
  const parsed = dictionaryEntrySchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false as const, error: 'Check the fields and try again.' };
  try {
    const db = await getDatabase();
    const updated = await db.update(dictionaryEntries).set(parsed.data).where(eq(dictionaryEntries.id, parsedId.data)).returning({ id: dictionaryEntries.id });
    if (updated.length === 0) return { ok: false as const, error: 'This phrase no longer exists. Your changes have not been saved.' };
  } catch {
    return { ok: false as const, error: 'Could not save phrase. Check the database and try again.' };
  }
  revalidatePath('/');
  return { ok: true as const };
}
