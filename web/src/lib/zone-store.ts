/**
 * CercaFungo — Zone Store
 *
 * LocalStorage persistence for detected foraging zones.
 * Handles save/load/update/delete and auto-detection on first load.
 */

import type { ForagingZone } from './zone-engine';
import { detectZones, haversineDistance } from './zone-engine';
import { getFindings } from './findings-store';

// ── Constants ─────────────────────────────────────────────────────────

const ZONE_STORAGE_KEY = 'cercafungo_zones';
const ZONE_VERSION_KEY = 'cercafungo_zones_version';

/** Bump this when you want to force re-detection on next load */
const CURRENT_ZONE_VERSION = 1;

// ── Internal helpers ──────────────────────────────────────────────────

function loadRaw(): ForagingZone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ZONE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(zones: ForagingZone[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(zones));
  localStorage.setItem(ZONE_VERSION_KEY, String(CURRENT_ZONE_VERSION));
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Get all saved zones, sorted by richness score descending.
 * If no zones exist but findings do, runs auto-detection first.
 */
export function getZones(): ForagingZone[] {
  const stored = loadRaw();

  // Auto-detect on first load if findings exist but no zones stored yet
  if (stored.length === 0) {
    const findings = getFindings();
    if (findings.length >= 2) {
      const detected = detectZones(findings);
      if (detected.length > 0) {
        saveRaw(detected);
        return [...detected].sort((a, b) => b.richnessScore - a.richnessScore);
      }
    }
    return [];
  }

  return [...stored].sort((a, b) => b.richnessScore - a.richnessScore);
}

/** Overwrite all zones with freshly detected ones */
export function saveZones(zones: ForagingZone[]): void {
  saveRaw(zones);
}

/** Update a single zone (e.g. name or isPrivate flag) */
export function updateZone(
  id: string,
  updates: Partial<Omit<ForagingZone, 'id'>>
): ForagingZone | null {
  const all = loadRaw();
  const index = all.findIndex((z) => z.id === id);
  if (index === -1) return null;

  const updated: ForagingZone = { ...all[index], ...updates, id };
  all[index] = updated;
  saveRaw(all);
  return updated;
}

/** Remove a zone permanently */
export function deleteZone(id: string): boolean {
  const all = loadRaw();
  const filtered = all.filter((z) => z.id !== id);
  if (filtered.length === all.length) return false;
  saveRaw(filtered);
  return true;
}

/**
 * Re-run the clustering algorithm from scratch using all current findings.
 * Preserves custom names and isPrivate flags from existing zones when
 * a matching zone center is found within 100m.
 */
export function redetectZones(): ForagingZone[] {
  const findings = getFindings();
  if (findings.length < 2) {
    saveRaw([]);
    return [];
  }

  const freshZones = detectZones(findings);

  // Try to preserve custom names from existing zones
  const existingZones = loadRaw();
  const merged = freshZones.map((fresh) => {
    // Find an existing zone whose center is within 100m of the fresh zone
    const match = existingZones.find((existing) =>
      haversineDistance(
        fresh.centerLat, fresh.centerLng,
        existing.centerLat, existing.centerLng,
      ) <= 100,
    );

    if (match) {
      return {
        ...fresh,
        // Preserve user customizations
        name: match.name,
        isPrivate: match.isPrivate,
      };
    }
    return fresh;
  });

  saveRaw(merged);
  return [...merged].sort((a, b) => b.richnessScore - a.richnessScore);
}
