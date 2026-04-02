/**
 * CercaFungo — Findings Store
 *
 * LocalStorage CRUD per i ritrovamenti fungini dell'utente.
 * Ogni ritrovamento include coordinate GPS, specie, data, foto opzionale.
 */

// ── Types ────────────────────────────────────────────────────────────

export type EdibilityStatus = 'commestibile' | 'tossico' | 'sconosciuto';

export type Season = 'primavera' | 'estate' | 'autunno' | 'inverno';

export interface MushroomFinding {
  id: string;
  /** ISO 8601 timestamp */
  date: string;
  /** Latitude WGS84 */
  lat: number;
  /** Longitude WGS84 */
  lng: number;
  /** Altitude in meters (optional — from GPS or estimate) */
  altitude?: number;
  /** Display name of the species */
  speciesName: string;
  /** Scientific name */
  scientificName?: string;
  /** Species id from SPECIES_DATABASE (if matched) */
  speciesId?: string;
  edibility: EdibilityStatus;
  /** 0–100 confidence from scanner (if any) */
  confidence?: number;
  /** Free text notes */
  notes?: string;
  /** Base64 data URL of photo (optional) */
  photoDataUrl?: string;
  /** Season derived from date */
  season: Season;
  /** Weather snapshot (optional) */
  weather?: {
    condition: string;
    tempC?: number;
  };
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  /** 0–1 intensity */
  intensity: number;
}

export interface FindingsStats {
  totalFindings: number;
  bySpecies: Record<string, number>;
  bySeason: Record<Season, number>;
  byMonth: Record<number, number>;
  mostFound: string | null;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'cercafungo_findings';

// Valtellina default center
export const DEFAULT_CENTER: [number, number] = [46.17, 9.87];
export const DEFAULT_ZOOM = 11;

// ── Helpers ──────────────────────────────────────────────────────────

function getSeason(isoDate: string): Season {
  const month = new Date(isoDate).getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'primavera';
  if (month >= 6 && month <= 8) return 'estate';
  if (month >= 9 && month <= 11) return 'autunno';
  return 'inverno';
}

function generateId(): string {
  return `finding_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadAll(): MushroomFinding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(findings: MushroomFinding[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(findings));
}

// ── CRUD ─────────────────────────────────────────────────────────────

export function getFindings(): MushroomFinding[] {
  return loadAll().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getFindingById(id: string): MushroomFinding | null {
  return loadAll().find((f) => f.id === id) ?? null;
}

export type NewFinding = Omit<MushroomFinding, 'id' | 'season'> & {
  season?: Season;
};

export function saveFinding(data: NewFinding): MushroomFinding {
  const all = loadAll();
  const finding: MushroomFinding = {
    ...data,
    id: generateId(),
    season: data.season ?? getSeason(data.date),
  };
  all.push(finding);
  saveAll(all);
  return finding;
}

export function updateFinding(
  id: string,
  updates: Partial<Omit<MushroomFinding, 'id'>>
): MushroomFinding | null {
  const all = loadAll();
  const index = all.findIndex((f) => f.id === id);
  if (index === -1) return null;

  const updated: MushroomFinding = {
    ...all[index],
    ...updates,
    id,
    season: updates.date
      ? getSeason(updates.date)
      : all[index].season,
  };
  all[index] = updated;
  saveAll(all);
  return updated;
}

export function deleteFinding(id: string): boolean {
  const all = loadAll();
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

// ── Analytics ────────────────────────────────────────────────────────

export function getHeatmapData(): HeatmapPoint[] {
  const findings = loadAll();
  if (findings.length === 0) return [];

  // Cluster nearby points and compute intensity
  const clusters: Map<string, { lat: number; lng: number; count: number }> = new Map();

  for (const f of findings) {
    // Round to ~100m grid
    const gridLat = Math.round(f.lat * 100) / 100;
    const gridLng = Math.round(f.lng * 100) / 100;
    const key = `${gridLat},${gridLng}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      clusters.set(key, { lat: gridLat, lng: gridLng, count: 1 });
    }
  }

  const maxCount = Math.max(...Array.from(clusters.values()).map((c) => c.count));

  return Array.from(clusters.values()).map((c) => ({
    lat: c.lat,
    lng: c.lng,
    intensity: maxCount > 0 ? c.count / maxCount : 0,
  }));
}

export function getStats(): FindingsStats {
  const findings = loadAll();

  const bySpecies: Record<string, number> = {};
  const bySeason: Record<Season, number> = {
    primavera: 0,
    estate: 0,
    autunno: 0,
    inverno: 0,
  };
  const byMonth: Record<number, number> = {};

  for (const f of findings) {
    bySpecies[f.speciesName] = (bySpecies[f.speciesName] ?? 0) + 1;
    bySeason[f.season] = (bySeason[f.season] ?? 0) + 1;
    const month = new Date(f.date).getMonth() + 1;
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }

  const mostFound =
    Object.entries(bySpecies).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { totalFindings: findings.length, bySpecies, bySeason, byMonth, mostFound };
}

// ── Import / Export ──────────────────────────────────────────────────

export function exportFindingsJson(): string {
  return JSON.stringify(loadAll(), null, 2);
}

export function importFindingsJson(json: string): {
  imported: number;
  errors: string[];
} {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { imported: 0, errors: ['JSON non valido'] };
  }

  if (!Array.isArray(parsed)) {
    return { imported: 0, errors: ['Il file deve contenere un array di ritrovamenti'] };
  }

  const existing = loadAll();
  const existingIds = new Set(existing.map((f) => f.id));
  let imported = 0;

  for (const item of parsed) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).lat !== 'number' ||
      typeof (item as Record<string, unknown>).lng !== 'number' ||
      typeof (item as Record<string, unknown>).speciesName !== 'string'
    ) {
      errors.push(`Voce non valida ignorata: ${JSON.stringify(item).slice(0, 60)}`);
      continue;
    }

    const finding = item as MushroomFinding;
    if (!existingIds.has(finding.id)) {
      existing.push({
        ...finding,
        season: finding.season ?? getSeason(finding.date),
      });
      existingIds.add(finding.id);
      imported += 1;
    }
  }

  saveAll(existing);
  return { imported, errors };
}

// ── Seed data (for demo / first run) ─────────────────────────────────

export function seedDemoFindings(): void {
  if (typeof window === 'undefined') return;
  if (loadAll().length > 0) return; // Only seed if empty

  const demos: NewFinding[] = [
    {
      date: '2024-09-14T08:30:00',
      lat: 46.215,
      lng: 9.845,
      altitude: 1420,
      speciesName: 'Porcino',
      scientificName: 'Boletus edulis',
      speciesId: 'boletus-edulis',
      edibility: 'commestibile',
      confidence: 94,
      notes: 'Tre esemplari bellissimi sotto i larici. Zona nord del bosco.',
      weather: { condition: 'Soleggiato', tempC: 14 },
    },
    {
      date: '2024-09-14T09:15:00',
      lat: 46.218,
      lng: 9.851,
      altitude: 1480,
      speciesName: 'Porcino',
      scientificName: 'Boletus edulis',
      speciesId: 'boletus-edulis',
      edibility: 'commestibile',
      confidence: 88,
      notes: 'Un solo esemplare grande, cappello 18 cm.',
    },
    {
      date: '2024-08-22T07:45:00',
      lat: 46.195,
      lng: 9.892,
      altitude: 1200,
      speciesName: 'Gallinaccio',
      scientificName: 'Cantharellus cibarius',
      speciesId: 'cantharellus-cibarius',
      edibility: 'commestibile',
      confidence: 91,
      notes: 'Gruppo numeroso vicino ai castagni.',
    },
    {
      date: '2024-04-28T10:00:00',
      lat: 46.172,
      lng: 9.874,
      altitude: 860,
      speciesName: 'Morchella',
      scientificName: 'Morchella esculenta',
      speciesId: 'morchella-esculenta',
      edibility: 'commestibile',
      confidence: 85,
      notes: 'Zona umida sul bordo del ruscello.',
    },
    {
      date: '2024-09-28T08:00:00',
      lat: 46.225,
      lng: 9.833,
      altitude: 1650,
      speciesName: 'Finferlo',
      scientificName: 'Cantharellus cibarius',
      edibility: 'commestibile',
      notes: 'Esemplari piccoli, probabilmente prima di ottobre è meglio tornare.',
    },
    {
      date: '2024-10-05T09:30:00',
      lat: 46.21,
      lng: 9.86,
      altitude: 1350,
      speciesName: 'Ovolo',
      scientificName: 'Amanita caesarea',
      speciesId: 'amanita-caesarea',
      edibility: 'commestibile',
      confidence: 79,
      notes: 'Uovo quasi integro trovato sotto una quercia. Raro in zona!',
    },
    {
      date: '2024-10-12T07:00:00',
      lat: 46.183,
      lng: 9.881,
      altitude: 1100,
      speciesName: 'Fungo non identificato',
      scientificName: undefined,
      edibility: 'sconosciuto',
      notes: 'Cappello rosso, spore bianche. Da identificare con esperto.',
    },
    {
      date: '2024-09-20T11:00:00',
      lat: 46.213,
      lng: 9.848,
      altitude: 1440,
      speciesName: 'Porcino',
      scientificName: 'Boletus edulis',
      speciesId: 'boletus-edulis',
      edibility: 'commestibile',
      confidence: 92,
      notes: 'Stessa zona del 14 settembre, altri 2 esemplari.',
    },
  ];

  const all = loadAll();
  for (const d of demos) {
    all.push({
      ...d,
      id: generateId(),
      season: getSeason(d.date),
    });
  }
  saveAll(all);
}
