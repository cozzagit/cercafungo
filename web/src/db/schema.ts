import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

// ── Users ──────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Findings (ritrovamenti sincronizzati dall'app mobile) ──────

export const findings = pgTable(
  'findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    speciesId: text('species_id').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    altitude: doublePrecision('altitude'),
    confidence: doublePrecision('confidence'),
    photoUrl: text('photo_url'),
    notes: text('notes'),
    foundAt: timestamp('found_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('findings_user_id_idx').on(table.userId),
    index('findings_species_id_idx').on(table.speciesId),
    index('findings_found_at_idx').on(table.foundAt),
  ]
);

// ── Feedback (correzioni utente per active learning) ───────────

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    findingId: uuid('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    wasCorrect: boolean('was_correct').notNull(),
    actualSpeciesId: text('actual_species_id'),
    photoUrl: text('photo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('feedback_user_id_idx').on(table.userId),
    index('feedback_finding_id_idx').on(table.findingId),
  ]
);

// ── Species Sightings (dati aggregati per heatmap) ─────────────

export const speciesSightings = pgTable(
  'species_sightings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    speciesId: text('species_id').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    count: integer('count').notNull().default(1),
  },
  (table) => [
    index('sightings_species_id_idx').on(table.speciesId),
    index('sightings_month_year_idx').on(table.month, table.year),
    index('sightings_geo_idx').on(table.latitude, table.longitude),
  ]
);
