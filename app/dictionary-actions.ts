'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { dictionaryEntrySchema } from '../lib/dictionary-entry';
import { protectedDictionary } from '../lib/protected-dictionary';

const signInError = 'Session expired or unavailable. Sign in again.';

export async function addDictionaryEntry(input: unknown) {
  const dictionary = await protectedDictionary();
  if (!dictionary) return { ok: false as const, error: signInError };
  const parsed = dictionaryEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Check the fields and try again.' };
  try {
    await dictionary.create(parsed.data);
  } catch {
    return { ok: false as const, error: 'Could not save phrase. Check the database and try again.' };
  }
  revalidatePath('/');
  return { ok: true as const };
}

export async function editDictionaryEntry(id: unknown, input: unknown) {
  const dictionary = await protectedDictionary();
  if (!dictionary) return { ok: false as const, error: signInError };
  const parsedId = z.number().int().positive().max(2147483647).safeParse(id);
  const parsed = dictionaryEntrySchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { ok: false as const, error: 'Check the fields and try again.' };
  try {
    if (!await dictionary.update(parsedId.data, parsed.data)) return { ok: false as const, error: 'This phrase no longer exists. Your changes have not been saved.' };
  } catch {
    return { ok: false as const, error: 'Could not save phrase. Check the database and try again.' };
  }
  revalidatePath('/');
  return { ok: true as const };
}

export async function deleteDictionaryEntry(input: unknown) {
  const dictionary = await protectedDictionary();
  if (!dictionary) return { ok: false as const, error: signInError };
  const parsed = z.number().int().positive().max(2147483647).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Could not delete phrase. Try again.' };
  try {
    const deleted = await dictionary.remove(parsed.data);
    revalidatePath('/');
    return { ok: true as const, deleted };
  } catch {
    return { ok: false as const, error: 'Could not delete phrase. Check the database and try again.' };
  }
}
