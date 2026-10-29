import { integer, pgTable } from 'drizzle-orm/pg-core';

export const databaseReady = pgTable('database_ready', {
  id: integer('id').primaryKey(),
});
