'use server';

import { AuthenticationError, PermissionDeniedError } from '@typesafe-ai/sdk';
import { z } from 'zod';
import { phraseSchema } from '../lib/dictionary-entry';
import { scoreMeaningMatch } from '../lib/meaning-match';
import { protectedDictionary } from '../lib/protected-dictionary';

export async function evaluateMeaningMatch(input: unknown) {
  const dictionary = await protectedDictionary();
  if (!dictionary) return { ok: false as const, error: 'Session expired or unavailable. Sign in again.' };
  const parsed = z.object({ id: z.number().int().positive().max(2147483647), answer: phraseSchema }).strict().safeParse(input);
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!parsed.success || !apiKey) return { ok: false as const, error: 'Check your Jev configuration and answer, then try again.' };
  try {
    const entry = await dictionary.findById(parsed.data.id);
    if (!entry) return { ok: false as const, error: 'This phrase no longer exists. Try another phrase.' };
    const score = await scoreMeaningMatch({ original: entry.original, language: entry.language, answer: parsed.data.answer }, { apiKey, baseURL: process.env.JEV_TEST_URL || 'https://api.typesafe.ai' });
    return { ok: true as const, score };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) return { ok: false as const, error: 'Check your Jev API key and try again; another attempt may incur a provider charge.' };
    return { ok: false as const, error: 'Could not evaluate your answer. Try again; another attempt may incur a provider charge.' };
  }
}
