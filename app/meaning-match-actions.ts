'use server';

import { AuthenticationError, PermissionDeniedError } from '@typesafe-ai/sdk';
import { dictionaryEntrySchema } from '../lib/dictionary-entry';
import { scoreMeaningMatch } from '../lib/meaning-match';

export async function evaluateMeaningMatch(input: unknown) {
  const parsed = dictionaryEntrySchema.omit({ translation: true }).extend({
    answer: dictionaryEntrySchema.shape.original,
  }).strict().safeParse(input);
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!parsed.success || !apiKey) return { ok: false as const, error: 'Check your Jev configuration and answer, then try again.' };
  try {
    const score = await scoreMeaningMatch(parsed.data, { apiKey, baseURL: process.env.JEV_TEST_URL || 'https://api.typesafe.ai' });
    return { ok: true as const, score };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) return { ok: false as const, error: 'Check your Jev API key and try again; another attempt may incur a provider charge.' };
    return { ok: false as const, error: 'Could not evaluate your answer. Try again; another attempt may incur a provider charge.' };
  }
}
