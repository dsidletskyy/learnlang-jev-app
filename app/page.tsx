import { desc } from 'drizzle-orm';
import { getDatabase } from '../db';
import { dictionaryEntries } from '../db/schema';
import Dictionary from './dictionary';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const entries = await loadEntries();
  if (!entries) return <main><h1>Dictionary</h1><p role="alert">Database is not ready. Start PostgreSQL, check DATABASE_URL, run pnpm db:migrate, and refresh.</p></main>;
  return <Dictionary entries={entries} />;
}

async function loadEntries() {
  try {
    const db = await getDatabase();
    return await db.select().from(dictionaryEntries).orderBy(desc(dictionaryEntries.createdAt), desc(dictionaryEntries.id));
  } catch {
    return null;
  }
}
