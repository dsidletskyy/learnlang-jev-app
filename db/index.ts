import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseReady } from './schema';

let pool: Pool | undefined;

export async function checkDatabaseReady(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    pool ??= new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
    await drizzle(pool).select().from(databaseReady).limit(1);
    return true;
  } catch {
    return false;
  }
}

export async function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  return drizzle(pool);
}
