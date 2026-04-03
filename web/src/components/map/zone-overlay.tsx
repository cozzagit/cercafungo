'use client';

/**
 * ZoneOverlay — Renders foraging zone circles on the Leaflet map.
 *
 * Each zone is drawn as a colored, semi-transparent circle whose color
 * reflects its richness score. Gold zones (75-100) have a subtle glow.
 * Clicking a zone opens a popup summary; the parent can intercept this
 * via onZoneClick to open the full detail sheet.
 */

import { useEffect, useRef } from 'react';
import type { ForagingZone } from '@/lib/zone-engine';

// ── Types ──────────────────────────────────────────────────────────────

interface ZoneOverlayProps {
  /** Leaflet map instance (any, because Leaflet is loaded dynamically) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapInstance: any;
  zones: ForagingZone[];
  visible: boolean;
  onZoneClick: (zone: ForagingZone) => void;
}

// ── Color helpers ──────────────────────────────────────────────────────

function zoneColor(score: number): { fill: string; stroke: string } {
  if (score >= 75) return { fill: '#FFD700', stroke: '#E6AC00' };   // Gold
  if (score >= 50) return { fill: '#F39C12', stroke: '#D68910' };   // Amber
  if (score >= 25) return { fill: '#27AE60', stroke: '#1E8449' };   // Green
  return { fill: '#95A5A6', stroke: '#7F8C8D' };                    // Gray
}

function zoneOpacity(lastVisited: string): number {
  const daysSince =
    (Date.now() - new Date(lastVisited).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= 30) return 0.35;
  if (daysSince <= 90) return 0.25;
  if (daysSince <= 365) return 0.18;
  return 0.12;
}

function formatLastVisited(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const MONTH_NAMES = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

/** Escape HTML entities to prevent XSS in Leaflet popup strings. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Component ──────────────────────────────────────────────────────────

export default function ZoneOverlay({
  mapInstance,
  zones,
  visible,
  onZoneClick,
}: ZoneOverlayProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circlesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapInstance) return;

    // Remove existing circles
    for (const c of circlesRef.current) {
      mapInstance.removeLayer(c);
    }
    circlesRef.current = [];

    if (!visible || zones.length === 0) return;

    async function drawZones() {
      const L = (await import('leaflet')).default;

      for (const zone of zones) {
        const { fill, stroke } = zoneColor(zone.richnessScore);
        const fillOpacity = zoneOpacity(zone.lastVisited);
        const isGold = zone.richnessScore >= 75;

        const circle = L.circle([zone.centerLat, zone.centerLng], {
          radius: zone.radiusMeters,
          color: stroke,
          weight: isGold ? 2.5 : 1.5,
          fillColor: fill,
          fillOpacity,
          opacity: isGold ? 0.9 : 0.7,
          // Gold glow via dashArray trick: not native in Leaflet, but
          // we add a second larger transparent circle for the glow effect
          className: isGold ? 'zone-circle-gold' : 'zone-circle',
        });

        // Build popup HTML
        const bestMonthsHtml = MONTH_NAMES.map((m, i) => {
          const active = zone.bestMonths.includes(i + 1);
          return `<span style="
            display:inline-block;
            width:22px;height:22px;
            border-radius:50%;
            background:${active ? fill : '#e8e4dc'};
            border:1.5px solid ${active ? stroke : '#ccc'};
            font-size:9px;
            font-weight:${active ? '700' : '400'};
            color:${active ? '#fff' : '#999'};
            text-align:center;
            line-height:20px;
            margin:1px;
          ">${m}</span>`;
        }).join('');

        const scoreColor = zone.richnessScore >= 75
          ? '#E6AC00'
          : zone.richnessScore >= 50
          ? '#D68910'
          : zone.richnessScore >= 25
          ? '#1E8449'
          : '#7F8C8D';

        const speciesHtml = zone.uniqueSpecies
          .slice(0, 4)
          .map((s) => `<span style="
            display:inline-block;
            background:#f0f4e8;
            border:1px solid #c8d8a8;
            border-radius:99px;
            padding:2px 8px;
            font-size:11px;
            color:#3a5c1c;
            margin:2px;
          ">${escapeHtml(s)}</span>`)
          .join('');

        const extraSpecies = zone.uniqueSpecies.length > 4
          ? `<span style="font-size:11px;color:#888">+${zone.uniqueSpecies.length - 4} altre</span>`
          : '';

        const popupContent = `
          <div style="min-width:200px;max-width:240px;font-family:system-ui,sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-weight:700;font-size:14px;color:#1a300d;">${escapeHtml(zone.name)}</span>
              <span style="
                background:${fill};
                color:${zone.richnessScore >= 50 ? '#fff' : '#333'};
                font-weight:700;
                font-size:12px;
                border-radius:99px;
                padding:2px 8px;
                border:1.5px solid ${stroke};
              ">${zone.richnessScore}/100</span>
            </div>

            <div style="height:6px;background:#e8e4dc;border-radius:3px;overflow:hidden;margin-bottom:8px;">
              <div style="height:100%;width:${zone.richnessScore}%;background:${scoreColor};border-radius:3px;"></div>
            </div>

            <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">
              ${zone.totalFindings} ritrovament${zone.totalFindings === 1 ? 'o' : 'i'} ·
              ${zone.uniqueSpecies.length} speci${zone.uniqueSpecies.length === 1 ? 'e' : 'e'} ·
              Ultimo: ${formatLastVisited(zone.lastVisited)}
            </div>

            <div style="margin-bottom:6px;">${speciesHtml}${extraSpecies}</div>

            <div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px;">${bestMonthsHtml}</div>

            <button
              onclick="window.__cfOpenZone('${zone.id}')"
              style="
                width:100%;
                padding:6px 0;
                background:#4a7c2e;
                color:white;
                border:none;
                border-radius:8px;
                font-size:12px;
                font-weight:600;
                cursor:pointer;
              "
            >Dettagli zona →</button>
          </div>
        `;

        circle.bindPopup(popupContent, { maxWidth: 260 });

        circle.on('click', () => {
          onZoneClick(zone);
        });

        circle.addTo(mapInstance);
        circlesRef.current.push(circle);

        // Gold glow: add a second, slightly larger transparent circle
        if (isGold) {
          const glowCircle = L.circle([zone.centerLat, zone.centerLng], {
            radius: zone.radiusMeters * 1.15,
            color: '#FFD700',
            weight: 1,
            fillColor: '#FFD700',
            fillOpacity: 0.06,
            opacity: 0.25,
            interactive: false,
          });
          glowCircle.addTo(mapInstance);
          circlesRef.current.push(glowCircle);
        }
      }
    }

    drawZones().catch(console.error);

    // Cleanup on unmount
    return () => {
      if (!mapInstance) return;
      for (const c of circlesRef.current) {
        mapInstance.removeLayer(c);
      }
      circlesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, zones, visible]);

  // This component renders nothing itself — all UI is in Leaflet layers
  return null;
}
