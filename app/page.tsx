import { desc } from 'drizzle-orm';
import { getDatabase } from '../db';
import { dictionaryEntries } from '../db/schema';
import Dictionary from './dictionary';
import DatabaseWarning from './database-warning';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const entries = await loadEntries();
  if (!entries) return <main><h1>Dictionary</h1><DatabaseWarning /></main>;
  return <Dictionary entries={entries} jevConfigured={!!process.env.TYPESAFE_API_KEY?.trim()} />;
}

async function loadEntries() {
  try {
    const db = await getDatabase();
    return await db.select().from(dictionaryEntries).orderBy(desc(dictionaryEntries.createdAt), desc(dictionaryEntries.id));
  } catch {
    return null;
  }
}
