/**
 * CercaFungo — Diary Store
 *
 * LocalStorage CRUD for foraging sessions (Diario del Cercatore).
 * Handles GPS tracking, distance accumulation, findings per session.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface SessionFinding {
  id: string;
  speciesId: string;
  speciesName: string;
  confidence: number;
  lat: number;
  lng: number;
  timestamp: string;
  notes: string;
}

export interface ForagingSession {
  id: string;
  title: string;
  startedAt: string; // ISO date
  endedAt: string | null;
  durationMinutes: number;
  distanceMeters: number;
  elevationGainMeters: number;
  trackPoints: TrackPoint[];
  findings: SessionFinding[];
  weatherSnapshot: { temp: number; humidity: number; conditions: string } | null;
  notes: string;
  rating: number; // 1-5, 0 = not rated
  speciesFound: string[];
}

export interface DiaryStats {
  totalSessions: number;
  totalKm: number;
  uniqueSpecies: string[];
  bestMonth: string | null;
  totalFindings: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSIONS_KEY = 'cercafungo_diary_sessions';
const ACTIVE_SESSION_KEY = 'cercafungo_diary_active';

const ITALIAN_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateFindingId(): string {
  return `finding_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Haversine formula — returns distance in meters between two GPS coords.
 */
export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function loadAllSessions(): ForagingSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllSessions(sessions: ForagingSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function recalcSpeciesFound(session: ForagingSession): string[] {
  const species = new Set<string>();
  for (const f of session.findings) {
    if (f.speciesName) species.add(f.speciesName);
  }
  return Array.from(species);
}

// ── Session CRUD ──────────────────────────────────────────────────────────────

export function startSession(
  weatherSnapshot?: ForagingSession['weatherSnapshot']
): ForagingSession {
  const now = new Date();
  const title = `Uscita del ${now.getDate()} ${ITALIAN_MONTHS[now.getMonth()]}`;

  const session: ForagingSession = {
    id: generateId(),
    title,
    startedAt: now.toISOString(),
    endedAt: null,
    durationMinutes: 0,
    distanceMeters: 0,
    elevationGainMeters: 0,
    trackPoints: [],
    findings: [],
    weatherSnapshot: weatherSnapshot ?? null,
    notes: '',
    rating: 0,
    speciesFound: [],
  };

  // Persist as active session
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
  }

  // Save to sessions list
  const all = loadAllSessions();
  all.push(session);
  saveAllSessions(all);

  return session;
}

export function endSession(id: string): ForagingSession | null {
  const all = loadAllSessions();
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const session = all[index];
  const endedAt = new Date().toISOString();
  const durationMinutes = Math.round(
    (new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
  );

  const updated: ForagingSession = {
    ...session,
    endedAt,
    durationMinutes,
    speciesFound: recalcSpeciesFound(session),
  };

  all[index] = updated;
  saveAllSessions(all);

  // Clear active session marker
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }

  return updated;
}

export function getActiveSession(): ForagingSession | null {
  if (typeof window === 'undefined') return null;
  const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!activeId) return null;

  const all = loadAllSessions();
  return all.find((s) => s.id === activeId && s.endedAt === null) ?? null;
}

export function getSessionById(id: string): ForagingSession | null {
  return loadAllSessions().find((s) => s.id === id) ?? null;
}

export function getAllSessions(): ForagingSession[] {
  return loadAllSessions()
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function updateSession(
  id: string,
  updates: Partial<Pick<ForagingSession, 'notes' | 'rating' | 'title'>>
): ForagingSession | null {
  const all = loadAllSessions();
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updated: ForagingSession = { ...all[index], ...updates };
  all[index] = updated;
  saveAllSessions(all);
  return updated;
}

export function deleteSession(id: string): boolean {
  const all = loadAllSessions();
  const filtered = all.filter((s) => s.id !== id);
  if (filtered.length === all.length) return false;
  saveAllSessions(filtered);

  // Clean up active if deleted
  if (typeof window !== 'undefined') {
    if (localStorage.getItem(ACTIVE_SESSION_KEY) === id) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }

  return true;
}

// ── Track Points ──────────────────────────────────────────────────────────────

export function addTrackPoint(
  sessionId: string,
  lat: number,
  lng: number
): void {
  const all = loadAllSessions();
  const index = all.findIndex((s) => s.id === sessionId);
  if (index === -1) return;

  const session = all[index];
  const point: TrackPoint = { lat, lng, timestamp: Date.now() };

  // Calculate incremental distance
  let extraMeters = 0;
  if (session.trackPoints.length > 0) {
    const prev = session.trackPoints[session.trackPoints.length - 1];
    const dist = haversineMeters(prev.lat, prev.lng, lat, lng);
    // Filter out GPS noise (ignore jumps < 2m or > 500m)
    if (dist >= 2 && dist <= 500) {
      extraMeters = dist;
    }
  }

  all[index] = {
    ...session,
    trackPoints: [...session.trackPoints, point],
    distanceMeters: session.distanceMeters + extraMeters,
    // Update duration in real-time
    durationMinutes: Math.round(
      (Date.now() - new Date(session.startedAt).getTime()) / 60000
    ),
  };

  saveAllSessions(all);
}

// ── Findings ──────────────────────────────────────────────────────────────────

export function addFindingToSession(
  sessionId: string,
  finding: Omit<SessionFinding, 'id'>
): SessionFinding | null {
  const all = loadAllSessions();
  const index = all.findIndex((s) => s.id === sessionId);
  if (index === -1) return null;

  const newFinding: SessionFinding = { ...finding, id: generateFindingId() };
  const session = all[index];

  const updatedFindings = [...session.findings, newFinding];
  all[index] = {
    ...session,
    findings: updatedFindings,
    speciesFound: recalcSpeciesFound({ ...session, findings: updatedFindings }),
  };

  saveAllSessions(all);
  return newFinding;
}

export function removeFinding(sessionId: string, findingId: string): boolean {
  const all = loadAllSessions();
  const index = all.findIndex((s) => s.id === sessionId);
  if (index === -1) return false;

  const session = all[index];
  const updatedFindings = session.findings.filter((f) => f.id !== findingId);
  all[index] = {
    ...session,
    findings: updatedFindings,
    speciesFound: recalcSpeciesFound({ ...session, findings: updatedFindings }),
  };

  saveAllSessions(all);
  return true;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getDiaryStats(): DiaryStats {
  const completed = getAllSessions();

  const totalKm =
    completed.reduce((sum, s) => sum + s.distanceMeters, 0) / 1000;

  const allSpecies = new Set<string>();
  const findingsByMonth: Record<number, number> = {};

  for (const session of completed) {
    for (const sp of session.speciesFound) allSpecies.add(sp);
    const month = new Date(session.startedAt).getMonth(); // 0-11
    findingsByMonth[month] = (findingsByMonth[month] ?? 0) + session.findings.length;
  }

  // Find best month (most findings)
  let bestMonthIndex: number | null = null;
  let maxFindings = 0;
  for (const [monthStr, count] of Object.entries(findingsByMonth)) {
    if (count > maxFindings) {
      maxFindings = count;
      bestMonthIndex = Number(monthStr);
    }
  }

  const bestMonth =
    bestMonthIndex !== null ? ITALIAN_MONTHS[bestMonthIndex] : null;

  const totalFindings = completed.reduce((sum, s) => sum + s.findings.length, 0);

  return {
    totalSessions: completed.length,
    totalKm: Math.round(totalKm * 10) / 10,
    uniqueSpecies: Array.from(allSpecies),
    bestMonth,
    totalFindings,
  };
}

// ── GPS Tracking ──────────────────────────────────────────────────────────────

let watchId: number | null = null;

export function startGpsTracking(
  sessionId: string,
  onPosition?: (lat: number, lng: number) => void
): void {
  if (typeof window === 'undefined' || !navigator.geolocation) return;
  if (watchId !== null) stopGpsTracking();

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      addTrackPoint(sessionId, lat, lng);
      onPosition?.(lat, lng);
    },
    (err) => {
      console.warn('GPS tracking error:', err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 30000,
    }
  );
}

export function stopGpsTracking(): void {
  if (typeof window === 'undefined' || watchId === null) return;
  navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

export function isGpsTracking(): boolean {
  return watchId !== null;
}

// ── Season helpers ────────────────────────────────────────────────────────────

export function getSeasonLabel(isoDate: string): string {
  const month = new Date(isoDate).getMonth() + 1;
  if (month >= 3 && month <= 5) return '🌸 Primavera';
  if (month >= 6 && month <= 8) return '☀️ Estate';
  if (month >= 9 && month <= 11) return '🍂 Autunno';
  return '❄️ Inverno';
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
