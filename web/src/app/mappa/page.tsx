'use client';

/**
 * Mappa Ritrovamenti — CercaFungo
 *
 * Full-screen interactive map of mushroom findings.
 * - OpenStreetMap / Terrain / Satellite tile layers
 * - Marker clustering + custom mushroom icons
 * - Heatmap overlay for "zone floride"
 * - Add finding modal with GPS auto-detect
 * - Filter by species, season, date range
 * - Finding detail bottom sheet
 * - LocalStorage persistence (no auth required)
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AddFindingModal from '@/components/map/add-finding-modal';
import FindingDetail from '@/components/map/finding-detail';

import {
  deleteFinding,
  getFindings,
  getHeatmapData,
  saveFinding,
  seedDemoFindings,
  type HeatmapPoint,
  type MushroomFinding,
  type NewFinding,
  type Season,
} from '@/lib/findings-store';
import type { MapLayer } from '@/components/map/mushroom-map';

// ── Dynamic import — Leaflet is SSR-incompatible ───────────────────

const MushroomMap = dynamic(
  () => import('@/components/map/mushroom-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-forest-900 gap-4">
        <span className="text-5xl animate-bounce">🍄</span>
        <p className="text-forest-300 text-sm font-medium">Caricamento mappa...</p>
      </div>
    ),
  }
);

// ── Filter types ───────────────────────────────────────────────────

const ALL_SEASONS: { value: Season | 'tutte'; label: string }[] = [
  { value: 'tutte', label: 'Tutte le stagioni' },
  { value: 'primavera', label: '🌸 Primavera' },
  { value: 'estate', label: '☀️ Estate' },
  { value: 'autunno', label: '🍂 Autunno' },
  { value: 'inverno', label: '❄️ Inverno' },
];

const EDIBILITY_FILTERS = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'commestibile', label: '🟢 Commestibili' },
  { value: 'tossico', label: '🔴 Tossici' },
  { value: 'sconosciuto', label: '🟡 Sconosciuti' },
] as const;

// ── Main component ─────────────────────────────────────────────────

export default function MappaPage() {
  // ── State ────────────────────────────────────────────────────────

  const [findings, setFindings] = useState<MushroomFinding[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // UI
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<MushroomFinding | null>(null);
  const [focusFinding, setFocusFinding] = useState<MushroomFinding | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayer>('terrain');
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  // Click-to-add coordinates
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterSeason, setFilterSeason] = useState<Season | 'tutte'>('tutte');
  const [filterEdibility, setFilterEdibility] = useState<'tutti' | MushroomFinding['edibility']>('tutti');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Stats
  const [showStats, setShowStats] = useState(false);

  const layerPickerRef = useRef<HTMLDivElement>(null);

  // ── Load data ─────────────────────────────────────────────────────

  const reload = useCallback(() => {
    const all = getFindings();
    setFindings(all);
    setHeatmapData(getHeatmapData());
  }, []);

  useEffect(() => {
    seedDemoFindings();
    reload();
    setIsLoaded(true);

    // Expose global callback for Leaflet popup buttons
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__cfOpenFinding = (id: string) => {
      const f = getFindings().find((x) => x.id === id);
      if (f) setSelectedFinding(f);
    };

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__cfOpenFinding;
    };
  }, [reload]);

  // Close layer picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (layerPickerRef.current && !layerPickerRef.current.contains(e.target as Node)) {
        setShowLayerPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Filtered findings ─────────────────────────────────────────────

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (filterSpecies && !f.speciesName.toLowerCase().includes(filterSpecies.toLowerCase())) {
        return false;
      }
      if (filterSeason !== 'tutte' && f.season !== filterSeason) return false;
      if (filterEdibility !== 'tutti' && f.edibility !== filterEdibility) return false;
      if (filterDateFrom && f.date < new Date(filterDateFrom).toISOString()) return false;
      if (filterDateTo && f.date > new Date(filterDateTo + 'T23:59:59').toISOString()) return false;
      return true;
    });
  }, [findings, filterSpecies, filterSeason, filterEdibility, filterDateFrom, filterDateTo]);

  const hasActiveFilters =
    filterSpecies !== '' ||
    filterSeason !== 'tutte' ||
    filterEdibility !== 'tutti' ||
    filterDateFrom !== '' ||
    filterDateTo !== '';

  // ── Unique species for dropdown ───────────────────────────────────

  const uniqueSpecies = useMemo(
    () => Array.from(new Set(findings.map((f) => f.speciesName))).sort(),
    [findings]
  );

  // ── Handlers ──────────────────────────────────────────────────────

  const handleSaveFinding = useCallback(
    (data: NewFinding) => {
      saveFinding(data);
      reload();
      setPendingCoords(null);
    },
    [reload]
  );

  const handleDeleteFinding = useCallback(
    (id: string) => {
      deleteFinding(id);
      setSelectedFinding(null);
      reload();
    },
    [reload]
  );

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
    setShowAddModal(true);
  }, []);

  const handleFocusOnMap = useCallback((finding: MushroomFinding) => {
    setFocusFinding(finding);
    setSelectedFinding(null);
    setTimeout(() => setFocusFinding(null), 1000);
  }, []);

  const clearFilters = () => {
    setFilterSpecies('');
    setFilterSeason('tutte');
    setFilterEdibility('tutti');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // ── Stats quick summary ───────────────────────────────────────────

  const statsSummary = useMemo(() => {
    const byEdibility = findings.reduce(
      (acc, f) => {
        acc[f.edibility] = (acc[f.edibility] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return {
      total: findings.length,
      commestibili: byEdibility.commestibile ?? 0,
      tossici: byEdibility.tossico ?? 0,
      sconosciuti: byEdibility.sconosciuto ?? 0,
    };
  }, [findings]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-forest-900">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="flex-shrink-0 z-[500] bg-forest-900/95 backdrop-blur-md border-b border-forest-700/50 h-14">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🍄</span>
              <span className="text-sm font-bold text-white font-[family-name:var(--font-playfair)] hidden sm:block">
                CercaFungo
              </span>
            </Link>
            <span className="text-forest-600 hidden sm:block">/</span>
            <span className="text-sm font-semibold text-amber-400 hidden sm:block">Mappa Ritrovamenti</span>
            <span className="text-sm font-semibold text-amber-400 sm:hidden">Mappa</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Heatmap toggle */}
            <button
              onClick={() => setShowHeatmap((v) => !v)}
              title={showHeatmap ? 'Nascondi heatmap' : 'Mostra zone floride'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                showHeatmap
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                  : 'bg-forest-800/80 border border-forest-700/50 text-forest-300 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
              </svg>
              <span className="hidden sm:block">Zone Floride</span>
            </button>

            {/* Layer picker */}
            <div ref={layerPickerRef} className="relative">
              <button
                onClick={() => setShowLayerPicker((v) => !v)}
                title="Cambia stile mappa"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest-800/80 border border-forest-700/50 text-forest-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
                <span className="hidden sm:block capitalize">{mapLayer === 'osm' ? 'Mappa' : mapLayer === 'terrain' ? 'Terreno' : 'Satellite'}</span>
              </button>

              {showLayerPicker && (
                <div className="absolute top-full right-0 mt-1.5 bg-forest-900 border border-forest-700/60 rounded-xl shadow-2xl overflow-hidden z-10 min-w-[140px]">
                  {(
                    [
                      { value: 'osm', label: '🗺️ Stradale' },
                      { value: 'terrain', label: '🏔️ Terreno' },
                      { value: 'satellite', label: '🛰️ Satellite' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setMapLayer(opt.value);
                        setShowLayerPicker(false);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                        mapLayer === opt.value
                          ? 'bg-forest-700/60 text-white font-semibold'
                          : 'text-forest-200 hover:bg-forest-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                hasActiveFilters
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                  : 'bg-forest-800/80 border border-forest-700/50 text-forest-300 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              <span className="hidden sm:block">Filtri</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </button>

            {/* Stats toggle */}
            <button
              onClick={() => setShowStats((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hidden sm:flex items-center gap-1.5 ${
                showStats
                  ? 'bg-forest-600/40 border border-forest-500/50 text-white'
                  : 'bg-forest-800/80 border border-forest-700/50 text-forest-300 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Statistiche
            </button>

            {/* Nav links */}
            <Link
              href="/guida"
              className="text-xs text-forest-300 hover:text-white transition-colors font-medium hidden md:block"
            >
              Guida
            </Link>
            <Link
              href="/scanner"
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:block">Scanner</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Filter bar (collapsible) ──────────────────────────────── */}
      {showFilters && (
        <div className="flex-shrink-0 z-[400] bg-forest-800/95 backdrop-blur-md border-b border-forest-700/50 px-3 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-2 items-center">
            {/* Species search */}
            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="w-full px-2 py-1.5 bg-forest-900/80 border border-forest-700/60 rounded-lg text-forest-100 text-xs outline-none focus:border-forest-500"
              >
                <option value="">Tutte le specie</option>
                {uniqueSpecies.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Season */}
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value as Season | 'tutte')}
              className="px-2 py-1.5 bg-forest-900/80 border border-forest-700/60 rounded-lg text-forest-100 text-xs outline-none focus:border-forest-500"
            >
              {ALL_SEASONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Edibility */}
            <select
              value={filterEdibility}
              onChange={(e) => setFilterEdibility(e.target.value as typeof filterEdibility)}
              className="px-2 py-1.5 bg-forest-900/80 border border-forest-700/60 rounded-lg text-forest-100 text-xs outline-none focus:border-forest-500"
            >
              {EDIBILITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Date from */}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2 py-1.5 bg-forest-900/80 border border-forest-700/60 rounded-lg text-forest-100 text-xs outline-none focus:border-forest-500 w-[120px]"
            />
            <span className="text-forest-500 text-xs">→</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2 py-1.5 bg-forest-900/80 border border-forest-700/60 rounded-lg text-forest-100 text-xs outline-none focus:border-forest-500 w-[120px]"
            />

            {/* Results count */}
            <span className="text-xs text-forest-400 font-medium">
              {filteredFindings.length} / {findings.length} ritrovamenti
            </span>

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
              >
                Azzera filtri
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Stats panel ──────────────────────────────────────────── */}
      {showStats && (
        <div className="flex-shrink-0 z-[400] bg-forest-800/95 backdrop-blur-md border-b border-forest-700/50 px-3 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto grid grid-cols-4 gap-3">
            {[
              { label: 'Totale', value: statsSummary.total, color: 'text-white' },
              { label: 'Commestibili', value: statsSummary.commestibili, color: 'text-green-400' },
              { label: 'Tossici', value: statsSummary.tossici, color: 'text-red-400' },
              { label: 'Sconosciuti', value: statsSummary.sconosciuti, color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="bg-forest-900/60 rounded-xl px-3 py-2 text-center border border-forest-700/40">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-forest-400 uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map area ─────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        {isLoaded && (
          <MushroomMap
            findings={filteredFindings}
            heatmapData={heatmapData}
            showHeatmap={showHeatmap}
            mapLayer={mapLayer}
            onMarkerClick={setSelectedFinding}
            onMapClick={handleMapClick}
            focusFinding={focusFinding}
          />
        )}

        {/* ── Floating controls ─────────────────────────────────── */}

        {/* Findings count badge */}
        <div className="absolute top-3 left-3 z-[400] bg-forest-900/90 backdrop-blur-sm border border-forest-700/60 rounded-xl px-3 py-2 pointer-events-none">
          <p className="text-[10px] text-forest-400 font-semibold uppercase tracking-wide">Ritrovamenti</p>
          <p className="text-lg font-bold text-white leading-tight">{filteredFindings.length}</p>
        </div>

        {/* Heatmap legend */}
        {showHeatmap && (
          <div className="absolute top-3 right-3 z-[400] bg-forest-900/90 backdrop-blur-sm border border-forest-700/60 rounded-xl px-3 py-2">
            <p className="text-[10px] text-forest-400 font-semibold uppercase tracking-wide mb-1.5">Zone Floride</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 rounded-full" style={{
                background: 'linear-gradient(to right, #27ae60, #c68b3e, #c0392b)'
              }} />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-forest-400">Pochi</span>
              <span className="text-[10px] text-forest-400">Molti</span>
            </div>
          </div>
        )}

        {/* Click-to-add hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[400] bg-forest-900/80 backdrop-blur-sm border border-forest-700/50 rounded-full px-4 py-1.5 pointer-events-none">
          <p className="text-[11px] text-forest-300 font-medium">
            Tocca la mappa per aggiungere un ritrovamento
          </p>
        </div>

        {/* Add finding FAB */}
        <button
          onClick={() => {
            setPendingCoords(null);
            setShowAddModal(true);
          }}
          className="absolute bottom-6 right-4 z-[400] w-14 h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all"
          title="Aggiungi ritrovamento"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        {/* No findings placeholder */}
        {isLoaded && filteredFindings.length === 0 && findings.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[300]">
            <div className="bg-forest-900/90 backdrop-blur-sm border border-forest-700/60 rounded-2xl px-6 py-5 text-center max-w-xs">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="text-white font-semibold text-sm">Nessun ritrovamento trovato</p>
              <p className="text-forest-400 text-xs mt-1">Prova a modificare i filtri</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isLoaded && findings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[300]">
            <div className="bg-forest-900/90 backdrop-blur-sm border border-forest-700/60 rounded-2xl px-6 py-5 text-center max-w-xs">
              <span className="text-3xl block mb-2">🍄</span>
              <p className="text-white font-semibold text-sm">Nessun ritrovamento ancora</p>
              <p className="text-forest-400 text-xs mt-1">
                Tocca il pulsante + per aggiungere il tuo primo ritrovamento
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}

      <AddFindingModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPendingCoords(null);
        }}
        onSave={handleSaveFinding}
        prefilledLat={pendingCoords?.lat}
        prefilledLng={pendingCoords?.lng}
      />

      <FindingDetail
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onDelete={handleDeleteFinding}
        onFocusOnMap={handleFocusOnMap}
      />

      {/* ── Leaflet CSS overrides ──────────────────────────────── */}
      <style>{`
        .leaflet-container {
          font-family: var(--font-sans, system-ui, sans-serif);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-popup-tip {
          background: white;
        }
        .cf-cluster-icon {
          width: 40px;
          height: 40px;
          background: #4a7c2e;
          border: 2px solid white;
          border-radius: 50%;
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(17, 32, 8, 0.95) !important;
          border: 1px solid rgba(74, 124, 46, 0.4) !important;
          color: #b8d1a9 !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 16px !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(45, 80, 22, 0.95) !important;
          color: white !important;
        }
        .leaflet-control-attribution {
          background: rgba(17, 32, 8, 0.7) !important;
          color: rgba(184, 209, 169, 0.6) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(184, 209, 169, 0.8) !important;
        }
        .markercluster-small, .markercluster-medium, .markercluster-large {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
