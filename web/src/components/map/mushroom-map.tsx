'use client';

/**
 * MushroomMap — Leaflet map component for CercaFungo
 *
 * Renders findings as color-coded markers (green/red/amber by edibility),
 * supports a heatmap overlay and marker clustering.
 * Uses dynamic import to avoid SSR issues with Leaflet.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { MushroomFinding, HeatmapPoint } from '@/lib/findings-store';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/findings-store';

// ── Types ──────────────────────────────────────────────────────────

export type MapLayer = 'osm' | 'terrain' | 'satellite';

interface MushroomMapProps {
  findings: MushroomFinding[];
  heatmapData: HeatmapPoint[];
  showHeatmap: boolean;
  mapLayer: MapLayer;
  onMarkerClick: (finding: MushroomFinding) => void;
  onMapClick?: (lat: number, lng: number) => void;
  /** If set, the map will pan+zoom to this finding */
  focusFinding?: MushroomFinding | null;
  /** Callback to expose the Leaflet map instance to the parent */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMapReady?: (map: any) => void;
}

// ── Tile URLs ──────────────────────────────────────────────────────

const TILE_LAYERS: Record<MapLayer, { url: string; attribution: string }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

// ── Marker color by edibility ──────────────────────────────────────

function markerColor(edibility: MushroomFinding['edibility']): string {
  switch (edibility) {
    case 'commestibile': return '#27ae60';
    case 'tossico': return '#c0392b';
    default: return '#c68b3e';
  }
}

function createMushroomIcon(color: string): string {
  // SVG mushroom icon as data URL
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
      </filter>
    </defs>
    <!-- Pin shape -->
    <ellipse cx="16" cy="12" rx="14" ry="12" fill="${color}" filter="url(#shadow)"/>
    <ellipse cx="16" cy="12" rx="14" ry="12" fill="none" stroke="white" stroke-width="1.5" opacity="0.6"/>
    <!-- Stem -->
    <rect x="13" y="20" width="6" height="12" rx="3" fill="${color}" opacity="0.85"/>
    <!-- Mushroom cap icon -->
    <ellipse cx="16" cy="11" rx="8" ry="6" fill="white" opacity="0.25"/>
    <rect x="11" y="13" width="10" height="3" rx="1.5" fill="white" opacity="0.4"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ── Component ──────────────────────────────────────────────────────

export default function MushroomMap({
  findings,
  heatmapData,
  showHeatmap,
  mapLayer,
  onMarkerClick,
  onMapClick,
  focusFinding,
  onMapReady,
}: MushroomMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerClusterRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatmapLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);

  // ── Initialize map ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let mounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      // Inject Leaflet CSS if not already present
      if (!document.querySelector('link[data-leaflet-css]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet-css', '');
        document.head.appendChild(link);
      }

      if (!mounted || !mapContainerRef.current) return;

      LRef.current = L;

      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });
      mapRef.current = map;

      // Notify parent that map is ready
      if (onMapReady) {
        onMapReady(map);
      }

      // Add tile layer
      const tileConfig = TILE_LAYERS[mapLayer];
      tileLayerRef.current = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: 19,
      }).addTo(map);

      // Custom zoom control position
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Map click handler
      if (onMapClick) {
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    initMap().catch(console.error);

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update tile layer when mapLayer changes ──────────────────────
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[mapLayer];
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [mapLayer]);

  // ── Update markers when findings change ──────────────────────────
  const updateMarkers = useCallback(async () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Remove old cluster group
    if (markerClusterRef.current) {
      map.removeLayer(markerClusterRef.current);
      markerClusterRef.current = null;
    }

    if (findings.length === 0) return;

    // Try to use marker cluster if available, fallback to layer group
    let group: ReturnType<typeof L.layerGroup>;
    try {
      // Dynamic import — may not be installed yet, graceful fallback
      await import('leaflet.markercluster');

      // Inject markercluster CSS if not already present
      if (!document.querySelector('link[data-markercluster-css]')) {
        const link1 = document.createElement('link');
        link1.rel = 'stylesheet';
        link1.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
        link1.setAttribute('data-markercluster-css', '');
        document.head.appendChild(link1);

        const link2 = document.createElement('link');
        link2.rel = 'stylesheet';
        link2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
        link2.setAttribute('data-markercluster-css-default', '');
        document.head.appendChild(link2);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      group = (L as any).markerClusterGroup({
        maxClusterRadius: 40,
        iconCreateFunction: (cluster: { getChildCount: () => number }) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div class="cf-cluster-icon">${count}</div>`,
            className: '',
            iconSize: [40, 40],
          });
        },
      });
    } catch {
      group = L.layerGroup();
    }

    for (const finding of findings) {
      const color = markerColor(finding.edibility);
      const icon = L.icon({
        iconUrl: createMushroomIcon(color),
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -42],
      });

      const dateStr = new Date(finding.date).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const edibilityLabel =
        finding.edibility === 'commestibile'
          ? '<span style="color:#27ae60;font-weight:700">Commestibile</span>'
          : finding.edibility === 'tossico'
          ? '<span style="color:#c0392b;font-weight:700">Tossico</span>'
          : '<span style="color:#c68b3e;font-weight:700">Sconosciuto</span>';

      const confidenceHtml =
        finding.confidence != null
          ? `<div style="margin-top:4px;font-size:11px;color:#6b7280">Confidenza AI: <strong>${finding.confidence}%</strong></div>`
          : '';

      const photoHtml =
        finding.photoDataUrl
          ? `<img src="${finding.photoDataUrl}" alt="Foto ritrovamento" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;"/>`
          : '';

      const popupContent = `
        <div style="min-width:160px;max-width:200px;font-family:system-ui,sans-serif;">
          ${photoHtml}
          <div style="font-weight:700;font-size:14px;color:#1a300d;margin-bottom:2px;">${finding.speciesName}</div>
          ${finding.scientificName ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-bottom:4px;">${finding.scientificName}</div>` : ''}
          ${edibilityLabel}
          ${confidenceHtml}
          <div style="margin-top:6px;font-size:11px;color:#6b7280">${dateStr}</div>
          ${finding.altitude ? `<div style="font-size:11px;color:#6b7280">${finding.altitude}m s.l.m.</div>` : ''}
          <button onclick="window.__cfOpenFinding('${finding.id}')" style="margin-top:8px;width:100%;padding:5px 0;background:#4a7c2e;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
            Dettagli →
          </button>
        </div>
      `;

      const marker = L.marker([finding.lat, finding.lng], { icon })
        .bindPopup(popupContent, { maxWidth: 220 });

      marker.on('click', () => {
        onMarkerClick(finding);
      });

      group.addLayer(marker);
    }

    group.addTo(map);
    markerClusterRef.current = group;
  }, [findings, onMarkerClick]);

  useEffect(() => {
    if (mapRef.current && LRef.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  // Retry marker update once map is ready (handles initial render timing)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current && LRef.current) {
        updateMarkers();
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update heatmap ───────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }

    if (!showHeatmap || heatmapData.length === 0) return;

    async function addHeatmap() {
      try {
        await import('leaflet.heat');
        const points = heatmapData.map((p) => [p.lat, p.lng, p.intensity] as [number, number, number]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        heatmapLayerRef.current = (L as any).heatLayer(points, {
          radius: 35,
          blur: 25,
          maxZoom: 17,
          gradient: { 0.3: '#27ae60', 0.6: '#c68b3e', 1.0: '#c0392b' },
        }).addTo(map);
      } catch {
        // leaflet.heat not available — skip silently
      }
    }

    addHeatmap();
  }, [showHeatmap, heatmapData]);

  // ── Focus on a specific finding ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusFinding) return;
    map.setView([focusFinding.lat, focusFinding.lng], 15, { animate: true });
  }, [focusFinding]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ background: '#e8e4dc' }}
      aria-label="Mappa ritrovamenti fungini"
    />
  );
}
