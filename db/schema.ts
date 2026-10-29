import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const databaseReady = pgTable('database_ready', {
  id: integer('id').primaryKey(),
});

export const dictionaryEntries = pgTable('dictionary_entries', {
  id: serial('id').primaryKey(),
  original: text('original').notNull(),
  language: text('language').notNull(),
  translation: text('translation').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
