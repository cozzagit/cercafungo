/**
 * CercaFungo — Zone Engine
 *
 * Spatial clustering algorithm (simplified DBSCAN) to detect "Zone Floride"
 * (rich foraging zones) from mushroom findings.
 */

import type { MushroomFinding } from './findings-store';

// ── Types ─────────────────────────────────────────────────────────────

export interface ForagingZone {
  id: string;
  /** Auto-generated or user-set name */
  name: string;
  centerLat: number;
  centerLng: number;
  /** Clustering radius in meters */
  radiusMeters: number;
  /** 0–100 richness score */
  richnessScore: number;
  totalFindings: number;
  uniqueSpecies: string[];
  /** Months (1-12) where findings were made in this zone */
  bestMonths: number[];
  /** ISO date of most recent finding */
  lastVisited: string;
  /** Whether the zone is marked private (flag for future community features) */
  isPrivate: boolean;
  /** IDs of findings belonging to this zone */
  findings: string[];
}

// ── Constants ─────────────────────────────────────────────────────────

/** Maximum distance (meters) to assign a finding to an existing cluster */
const CLUSTER_RADIUS_METERS = 150;

/** Minimum findings needed to seed a new cluster */
const MIN_CLUSTER_SIZE = 2;

// ── Haversine distance ────────────────────────────────────────────────

/**
 * Calculate the great-circle distance between two coordinates using the
 * Haversine formula. Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Auto-name generator ───────────────────────────────────────────────

const ZONE_NAME_PREFIXES = [
  'Bosco',
  'Valle',
  'Radura',
  'Prato',
  'Colle',
  'Margine',
  'Radure',
  'Altura',
  'Pianoro',
  'Fondo',
];

const ZONE_NAME_SUFFIXES = [
  'dei Porcini',
  'dei Funghi',
  'Fiorito',
  'Segreto',
  'della Fortuna',
  'dei Larici',
  'del Bosco',
  'dei Gallinacci',
  'Magico',
  'Dorato',
];

function generateZoneName(index: number): string {
  const prefix = ZONE_NAME_PREFIXES[index % ZONE_NAME_PREFIXES.length];
  const suffix = ZONE_NAME_SUFFIXES[Math.floor(index / ZONE_NAME_PREFIXES.length) % ZONE_NAME_SUFFIXES.length];
  return `${prefix} ${suffix}`;
}

function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Richness score calculator ─────────────────────────────────────────

function calculateRichnessScore(
  uniqueSpecies: string[],
  totalFindings: number,
  lastVisited: string
): number {
  const speciesPoints = uniqueSpecies.length * 25;
  const findingsPoints = totalFindings * 5;

  const now = Date.now();
  const lastDate = new Date(lastVisited).getTime();
  const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);

  let recencyBonus = 0;
  if (daysSince <= 30) recencyBonus = 20;
  else if (daysSince <= 90) recencyBonus = 10;

  return Math.min(100, speciesPoints + findingsPoints + recencyBonus);
}

// ── Cluster centroid recalculation ────────────────────────────────────

interface RawCluster {
  id: string;
  findings: MushroomFinding[];
  centerLat: number;
  centerLng: number;
}

function recalcCentroid(cluster: RawCluster): void {
  const n = cluster.findings.length;
  if (n === 0) return;
  cluster.centerLat = cluster.findings.reduce((s, f) => s + f.lat, 0) / n;
  cluster.centerLng = cluster.findings.reduce((s, f) => s + f.lng, 0) / n;
}

// ── Main clustering algorithm ─────────────────────────────────────────

/**
 * Detect foraging zones from a list of findings using a simplified DBSCAN
 * approach:
 * 1. For each finding, try to assign it to an existing cluster within radius.
 * 2. If no cluster found, collect it as a candidate.
 * 3. After processing all findings, form new clusters from nearby candidates.
 * 4. Build ForagingZone objects with richness scores.
 */
export function detectZones(findings: MushroomFinding[]): ForagingZone[] {
  if (findings.length === 0) return [];

  const clusters: RawCluster[] = [];
  const unassigned: MushroomFinding[] = [];

  // Pass 1 — assign findings to existing clusters or mark as unassigned
  for (const finding of findings) {
    let assignedCluster: RawCluster | null = null;
    let minDist = Infinity;

    for (const cluster of clusters) {
      const dist = haversineDistance(
        finding.lat,
        finding.lng,
        cluster.centerLat,
        cluster.centerLng
      );
      if (dist <= CLUSTER_RADIUS_METERS && dist < minDist) {
        minDist = dist;
        assignedCluster = cluster;
      }
    }

    if (assignedCluster) {
      assignedCluster.findings.push(finding);
      recalcCentroid(assignedCluster);
    } else {
      unassigned.push(finding);
    }
  }

  // Pass 2 — form new clusters from unassigned findings
  const remaining: MushroomFinding[] = [...unassigned];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const nearby: MushroomFinding[] = [seed];

    // Find all remaining within radius
    for (let i = remaining.length - 1; i >= 0; i--) {
      const dist = haversineDistance(seed.lat, seed.lng, remaining[i].lat, remaining[i].lng);
      if (dist <= CLUSTER_RADIUS_METERS) {
        nearby.push(remaining[i]);
        remaining.splice(i, 1);
      }
    }

    if (nearby.length >= MIN_CLUSTER_SIZE) {
      // Enough neighbors — form a new cluster
      const newCluster: RawCluster = {
        id: generateZoneId(),
        findings: nearby,
        centerLat: 0,
        centerLng: 0,
      };
      recalcCentroid(newCluster);

      // Check if the new cluster center is close to an existing cluster
      let merged = false;
      for (const existing of clusters) {
        const dist = haversineDistance(
          newCluster.centerLat,
          newCluster.centerLng,
          existing.centerLat,
          existing.centerLng
        );
        if (dist <= CLUSTER_RADIUS_METERS) {
          existing.findings.push(...nearby);
          recalcCentroid(existing);
          merged = true;
          break;
        }
      }

      if (!merged) {
        clusters.push(newCluster);
      }
    }
    // If only 1 finding with no neighbors, it stays unassigned (no zone)
  }

  // Pass 3 — build ForagingZone objects
  return clusters.map((cluster, index) => {
    const speciesSet = new Set(cluster.findings.map((f) => f.speciesName));
    const uniqueSpecies = Array.from(speciesSet);

    const monthSet = new Set(
      cluster.findings.map((f) => new Date(f.date).getMonth() + 1)
    );
    const bestMonths = Array.from(monthSet).sort((a, b) => a - b);

    const sortedByDate = [...cluster.findings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastVisited = sortedByDate[0]?.date ?? new Date().toISOString();

    const richnessScore = calculateRichnessScore(uniqueSpecies, cluster.findings.length, lastVisited);

    return {
      id: cluster.id,
      name: generateZoneName(index),
      centerLat: cluster.centerLat,
      centerLng: cluster.centerLng,
      radiusMeters: CLUSTER_RADIUS_METERS,
      richnessScore,
      totalFindings: cluster.findings.length,
      uniqueSpecies,
      bestMonths,
      lastVisited,
      isPrivate: false,
      findings: cluster.findings.map((f) => f.id),
    } satisfies ForagingZone;
  });
}

// ── Utility functions ─────────────────────────────────────────────────

/** Find the zone that contains a given lat/lng coordinate */
export function getZoneForLocation(
  lat: number,
  lng: number,
  zones: ForagingZone[]
): ForagingZone | null {
  let nearest: ForagingZone | null = null;
  let minDist = Infinity;

  for (const zone of zones) {
    const dist = haversineDistance(lat, lng, zone.centerLat, zone.centerLng);
    if (dist <= zone.radiusMeters && dist < minDist) {
      minDist = dist;
      nearest = zone;
    }
  }

  return nearest;
}

export interface ZoneStats {
  total: number;
  avgRichness: number;
  bestZone: ForagingZone | null;
  mostSpeciesZone: ForagingZone | null;
}

/** Aggregate stats across all zones */
export function getZoneStats(zones: ForagingZone[]): ZoneStats {
  if (zones.length === 0) {
    return { total: 0, avgRichness: 0, bestZone: null, mostSpeciesZone: null };
  }

  const avgRichness = Math.round(
    zones.reduce((s, z) => s + z.richnessScore, 0) / zones.length
  );

  const bestZone = zones.reduce((best, z) =>
    z.richnessScore > best.richnessScore ? z : best
  );

  const mostSpeciesZone = zones.reduce((best, z) =>
    z.uniqueSpecies.length > best.uniqueSpecies.length ? z : best
  );

  return { total: zones.length, avgRichness, bestZone, mostSpeciesZone };
}
