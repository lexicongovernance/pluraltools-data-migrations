import { relations } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { questions } from './questions';
import { events } from './events';

export const cycles = pgTable(
  'cycles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    // OPEN / CLOSED / UPCOMING
    status: varchar('status', {
      length: 20,
    }).default('UPCOMING'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    statusIndex: index('status_idx').on(t.status),
  }),
);

export const cyclesRelations = relations(cycles, ({ many, one }) => ({
  questions: many(questions),
  event: one(events, {
    fields: [cycles.eventId],
    references: [events.id],
  }),
}));

export type Cycle = typeof cycles.$inferSelect;
