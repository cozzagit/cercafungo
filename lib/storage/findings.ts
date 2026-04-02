/**
 * CercaFungo — CRUD per i ritrovamenti salvati (SQLite)
 */

import * as SQLite from 'expo-sqlite';
import { DB_NAME, DB_VERSION } from '../constants';

export interface Finding {
  id: string;
  speciesId: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  imagePath: string | null;
  notes: string | null;
  edibility: string;
  createdAt: string; // ISO string
}

export interface FindingInput {
  speciesId: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  imagePath?: string | null;
  notes?: string | null;
  edibility: string;
}

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Apre e inizializza il database SQLite.
 */
export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY NOT NULL,
      species_id TEXT NOT NULL,
      common_name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      confidence REAL NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      altitude REAL,
      image_path TEXT,
      notes TEXT,
      edibility TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_findings_species ON findings(species_id);
    CREATE INDEX IF NOT EXISTS idx_findings_created ON findings(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_findings_edibility ON findings(edibility);

    CREATE TABLE IF NOT EXISTS db_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // Salva versione DB
  await db.runAsync(
    `INSERT OR REPLACE INTO db_meta (key, value) VALUES ('version', ?)`,
    [String(DB_VERSION)]
  );
}

/**
 * Ottieni il database (assicura che sia inizializzato).
 */
function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error(
      'Database non inizializzato. Chiama initDatabase() prima.'
    );
  }
  return db;
}

/**
 * Genera un ID univoco per un ritrovamento.
 */
function generateId(): string {
  return `find_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Salva un nuovo ritrovamento.
 */
export async function saveFinding(input: FindingInput): Promise<Finding> {
  const database = getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO findings (id, species_id, common_name, scientific_name, confidence, latitude, longitude, altitude, image_path, notes, edibility, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.speciesId,
      input.commonName,
      input.scientificName,
      input.confidence,
      input.latitude,
      input.longitude,
      input.altitude ?? null,
      input.imagePath ?? null,
      input.notes ?? null,
      input.edibility,
      createdAt,
    ]
  );

  return {
    id,
    ...input,
    altitude: input.altitude ?? null,
    imagePath: input.imagePath ?? null,
    notes: input.notes ?? null,
    createdAt,
  };
}

/**
 * Ottieni un ritrovamento per ID.
 */
export async function getFindingById(
  id: string
): Promise<Finding | null> {
  const database = getDb();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM findings WHERE id = ?`,
    [id]
  );

  if (!row) return null;
  return mapRowToFinding(row);
}

/**
 * Lista tutti i ritrovamenti, ordinati dal piu recente.
 */
export async function getAllFindings(
  limit: number = 100,
  offset: number = 0
): Promise<Finding[]> {
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM findings ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return rows.map(mapRowToFinding);
}

/**
 * Cerca ritrovamenti per specie.
 */
export async function getFindingsBySpecies(
  speciesId: string
): Promise<Finding[]> {
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM findings WHERE species_id = ? ORDER BY created_at DESC`,
    [speciesId]
  );

  return rows.map(mapRowToFinding);
}

/**
 * Elimina un ritrovamento.
 */
export async function deleteFinding(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(`DELETE FROM findings WHERE id = ?`, [id]);
}

/**
 * Aggiorna le note di un ritrovamento.
 */
export async function updateFindingNotes(
  id: string,
  notes: string
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE findings SET notes = ? WHERE id = ?`,
    [notes, id]
  );
}

/**
 * Conta il totale dei ritrovamenti.
 */
export async function countFindings(): Promise<number> {
  const database = getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM findings`
  );
  return result?.count ?? 0;
}

/**
 * Conta le specie uniche trovate.
 */
export async function countUniqueSpecies(): Promise<number> {
  const database = getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT species_id) as count FROM findings`
  );
  return result?.count ?? 0;
}

/**
 * Statistiche aggregate per il profilo.
 */
export async function getStats(): Promise<{
  totalFindings: number;
  uniqueSpecies: number;
  edibleCount: number;
  toxicCount: number;
}> {
  const database = getDb();

  const total = await countFindings();
  const unique = await countUniqueSpecies();

  const edible = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM findings WHERE edibility IN ('ottimo', 'buono', 'commestibile')`
  );
  const toxic = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM findings WHERE edibility IN ('tossico', 'mortale')`
  );

  return {
    totalFindings: total,
    uniqueSpecies: unique,
    edibleCount: edible?.count ?? 0,
    toxicCount: toxic?.count ?? 0,
  };
}

/**
 * Mappa un row SQLite al tipo Finding.
 */
function mapRowToFinding(row: Record<string, unknown>): Finding {
  return {
    id: row.id as string,
    speciesId: row.species_id as string,
    commonName: row.common_name as string,
    scientificName: row.scientific_name as string,
    confidence: row.confidence as number,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    altitude: (row.altitude as number) ?? null,
    imagePath: (row.image_path as string) ?? null,
    notes: (row.notes as string) ?? null,
    edibility: row.edibility as string,
    createdAt: row.created_at as string,
  };
}
