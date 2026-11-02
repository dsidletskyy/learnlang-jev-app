import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { dictionaryEntries } from './schema';

type EntryInput = Pick<typeof dictionaryEntries.$inferInsert, 'original' | 'language' | 'translation'>;

// Call only with an owner ID obtained from a server-validated session, never request input.
export function dictionaryForOwner(db: NodePgDatabase, ownerId: string) {
  if (typeof ownerId !== 'string' || !ownerId.trim()) throw new Error('A session owner is required');
  const owned = eq(dictionaryEntries.ownerId, ownerId);
  const ownedId = (id: number) => and(owned, eq(dictionaryEntries.id, id));
  const values = (input: EntryInput) => ({
    original: input.original,
    language: input.language,
    translation: input.translation,
  });

  return {
    list: () => db.select().from(dictionaryEntries).where(owned)
      .orderBy(desc(dictionaryEntries.createdAt), desc(dictionaryEntries.id)),
    listByLanguage: (language: string) => db.select().from(dictionaryEntries)
      .where(and(owned, eq(dictionaryEntries.language, language))),
    async findById(id: number) {
      const [entry] = await db.select().from(dictionaryEntries).where(ownedId(id)).limit(1);
      return entry;
    },
    async create(input: EntryInput) {
      const [entry] = await db.insert(dictionaryEntries).values({ ...values(input), ownerId }).returning();
      return entry;
    },
    async update(id: number, input: EntryInput) {
      const rows = await db.update(dictionaryEntries).set(values(input)).where(ownedId(id))
        .returning({ id: dictionaryEntries.id });
      return rows.length > 0;
    },
    async remove(id: number) {
      const rows = await db.delete(dictionaryEntries).where(ownedId(id)).returning({ id: dictionaryEntries.id });
      return rows.length > 0;
    },
  };
}
