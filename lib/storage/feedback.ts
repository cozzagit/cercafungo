/**
 * CercaFungo — Feedback utente per active learning
 *
 * Salva le correzioni dell'utente ai rilevamenti per migliorare
 * il modello nel tempo (active learning loop).
 */

import * as SQLite from 'expo-sqlite';
import { DB_NAME } from '../constants';

export interface FeedbackEntry {
  id: string;
  findingId: string;
  predictedSpeciesId: string;
  predictedConfidence: number;
  correctedSpeciesId: string | null; // null = confermato corretto
  isCorrect: boolean;
  imagePath: string | null;
  createdAt: string;
  synced: boolean; // se e stato inviato al server
}

export interface FeedbackInput {
  findingId: string;
  predictedSpeciesId: string;
  predictedConfidence: number;
  correctedSpeciesId?: string | null;
  isCorrect: boolean;
  imagePath?: string | null;
}

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Inizializza la tabella feedback (chiamata dopo initDatabase).
 */
export async function initFeedbackTable(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY NOT NULL,
      finding_id TEXT NOT NULL,
      predicted_species_id TEXT NOT NULL,
      predicted_confidence REAL NOT NULL,
      corrected_species_id TEXT,
      is_correct INTEGER NOT NULL DEFAULT 1,
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_finding ON feedback(finding_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_synced ON feedback(synced);
  `);
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database feedback non inizializzato.');
  }
  return db;
}

function generateId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Salva un feedback dell'utente.
 */
export async function saveFeedback(
  input: FeedbackInput
): Promise<FeedbackEntry> {
  const database = getDb();
  const id = generateId();
  const createdAt = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO feedback (id, finding_id, predicted_species_id, predicted_confidence, corrected_species_id, is_correct, image_path, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      input.findingId,
      input.predictedSpeciesId,
      input.predictedConfidence,
      input.correctedSpeciesId ?? null,
      input.isCorrect ? 1 : 0,
      input.imagePath ?? null,
      createdAt,
    ]
  );

  return {
    id,
    findingId: input.findingId,
    predictedSpeciesId: input.predictedSpeciesId,
    predictedConfidence: input.predictedConfidence,
    correctedSpeciesId: input.correctedSpeciesId ?? null,
    isCorrect: input.isCorrect,
    imagePath: input.imagePath ?? null,
    createdAt,
    synced: false,
  };
}

/**
 * Ottieni feedback non ancora sincronizzati con il server.
 */
export async function getUnsyncedFeedback(): Promise<FeedbackEntry[]> {
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM feedback WHERE synced = 0 ORDER BY created_at ASC`
  );

  return rows.map(mapRowToFeedback);
}

/**
 * Segna i feedback come sincronizzati.
 */
export async function markFeedbackSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const database = getDb();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE feedback SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

/**
 * Statistiche accuratezza modello basate sui feedback.
 */
export async function getAccuracyStats(): Promise<{
  total: number;
  correct: number;
  accuracy: number;
}> {
  const database = getDb();
  const result = await database.getFirstAsync<{
    total: number;
    correct: number;
  }>(
    `SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct FROM feedback`
  );

  const total = result?.total ?? 0;
  const correct = result?.correct ?? 0;

  return {
    total,
    correct,
    accuracy: total > 0 ? correct / total : 0,
  };
}

function mapRowToFeedback(row: Record<string, unknown>): FeedbackEntry {
  return {
    id: row.id as string,
    findingId: row.finding_id as string,
    predictedSpeciesId: row.predicted_species_id as string,
    predictedConfidence: row.predicted_confidence as number,
    correctedSpeciesId: (row.corrected_species_id as string) ?? null,
    isCorrect: (row.is_correct as number) === 1,
    imagePath: (row.image_path as string) ?? null,
    createdAt: row.created_at as string,
    synced: (row.synced as number) === 1,
  };
}
