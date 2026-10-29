import { checkDatabaseReady } from '../db';
import ConnectionCheck from './connection-check';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const ready = await checkDatabaseReady();
  return (
    <main>
      <ConnectionCheck />
      {!ready && <p role="alert">Database is not ready. Start PostgreSQL, check DATABASE_URL, run pnpm db:migrate, and refresh.</p>}
    </main>
  );
}
