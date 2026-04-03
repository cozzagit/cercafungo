/**
 * CercaFungo — Scan Store
 *
 * LocalStorage persistence for scanner detections.
 * Stores recent scans with thumbnail photos for:
 * - User review / history
 * - ML feedback (confirm/correct species → future training data)
 *
 * Automatic cleanup: keeps only the last MAX_SCANS entries
 * and caps photo size to avoid filling localStorage.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ScanRecord {
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Detected label from model */
  detectedLabel: string;
  /** Model confidence 0-1 */
  confidence: number;
  /** Species ID if matched to SPECIES_DATABASE */
  speciesId: string | null;
  /** Scanner mode used */
  scannerMode: 'standard' | 'extended' | 'morchella';
  /** Base64 JPEG thumbnail (resized to save space) */
  thumbnail: string | null;
  /** GPS coordinates if available */
  lat: number | null;
  lng: number | null;
  /** User feedback — null = no feedback yet */
  feedback: {
    wasCorrect: boolean;
    actualSpeciesId?: string;
    feedbackAt: string;
  } | null;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'cercafungo_scans';
const MAX_SCANS = 50;
const THUMBNAIL_MAX_SIZE = 320; // px
const JPEG_QUALITY = 0.6;

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadScans(): ScanRecord[] {
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

function saveScans(scans: ScanRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch (e) {
    // localStorage full — remove oldest scans with thumbnails
    const trimmed = scans.slice(0, MAX_SCANS / 2);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

// ── Thumbnail generation ─────────────────────────────────────────────

/**
 * Resize a video frame or image blob to a small JPEG base64 thumbnail.
 */
export async function createThumbnail(
  source: HTMLVideoElement | Blob
): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (source instanceof HTMLVideoElement) {
      const vw = source.videoWidth;
      const vh = source.videoHeight;
      const scale = Math.min(THUMBNAIL_MAX_SIZE / vw, THUMBNAIL_MAX_SIZE / vh);
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    } else {
      // Blob → ImageBitmap
      const bitmap = await createImageBitmap(source);
      const scale = Math.min(
        THUMBNAIL_MAX_SIZE / bitmap.width,
        THUMBNAIL_MAX_SIZE / bitmap.height,
      );
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
    }

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return null;
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────

/**
 * Save a new scan detection.
 */
export function saveScan(
  data: Omit<ScanRecord, 'id' | 'timestamp' | 'feedback'>
): ScanRecord {
  const record: ScanRecord = {
    ...data,
    id: generateId(),
    timestamp: new Date().toISOString(),
    feedback: null,
  };

  const scans = loadScans();
  scans.unshift(record);

  // Enforce max — remove oldest
  if (scans.length > MAX_SCANS) {
    scans.length = MAX_SCANS;
  }

  saveScans(scans);
  return record;
}

/**
 * Get all saved scans (most recent first).
 */
export function getScans(): ScanRecord[] {
  return loadScans();
}

/**
 * Get scans pending feedback (no user confirmation yet).
 */
export function getPendingFeedbackScans(): ScanRecord[] {
  return loadScans().filter((s) => s.feedback === null && s.confidence > 0);
}

/**
 * Get scans with confirmed feedback (useful for ML training).
 */
export function getConfirmedScans(): ScanRecord[] {
  return loadScans().filter((s) => s.feedback !== null);
}

/**
 * Add user feedback to a scan (correct/incorrect species).
 */
export function addFeedback(
  scanId: string,
  wasCorrect: boolean,
  actualSpeciesId?: string,
): ScanRecord | null {
  const scans = loadScans();
  const index = scans.findIndex((s) => s.id === scanId);
  if (index === -1) return null;

  scans[index] = {
    ...scans[index],
    feedback: {
      wasCorrect,
      actualSpeciesId,
      feedbackAt: new Date().toISOString(),
    },
  };

  saveScans(scans);
  return scans[index];
}

/**
 * Delete a specific scan.
 */
export function deleteScan(scanId: string): boolean {
  const scans = loadScans();
  const filtered = scans.filter((s) => s.id !== scanId);
  if (filtered.length === scans.length) return false;
  saveScans(filtered);
  return true;
}

/**
 * Clear all scans.
 */
export function clearScans(): void {
  saveScans([]);
}

/**
 * Get scan statistics.
 */
export function getScanStats(): {
  total: number;
  withFeedback: number;
  confirmed: number;
  corrected: number;
} {
  const scans = loadScans();
  const withFeedback = scans.filter((s) => s.feedback !== null);
  return {
    total: scans.length,
    withFeedback: withFeedback.length,
    confirmed: withFeedback.filter((s) => s.feedback!.wasCorrect).length,
    corrected: withFeedback.filter((s) => !s.feedback!.wasCorrect).length,
  };
}
