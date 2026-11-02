import 'server-only';
import { headers } from 'next/headers';
import { getDatabase } from '../db';
import { dictionaryForOwner } from '../db/dictionary-owner-access';
import { createLocalAuth, validatedSession } from './auth';

export async function protectedDictionary() {
  try {
    const db = await getDatabase();
    const session = await validatedSession(createLocalAuth(db), await headers());
    return session ? dictionaryForOwner(db, session.user.id) : null;
  } catch {
    return null;
  }
}
