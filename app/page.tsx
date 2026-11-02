import { redirect } from 'next/navigation';
import { protectedDictionary } from '../lib/protected-dictionary';
import Dictionary from './dictionary';
import DatabaseWarning from './database-warning';
import { signOutAction } from './auth-actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const dictionary = await protectedDictionary();
  if (!dictionary) redirect('/sign-in');
  const entries = await dictionary.list().catch(() => null);
  if (!entries) return <main><h1>Dictionary</h1><DatabaseWarning /></main>;
  return <><form action={signOutAction}><button type="submit">Sign out</button></form><Dictionary entries={entries} jevConfigured={!!process.env.TYPESAFE_API_KEY?.trim()} /></>;
}
