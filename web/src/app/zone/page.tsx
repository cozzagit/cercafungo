'use client';

/**
 * Zone Floride — Lista zone di raccolta funghi rilevate automaticamente
 *
 * Mostra tutte le zone clusterate dai ritrovamenti, ordinate per
 * indice di ricchezza. Permette di rieseguire il clustering e di
 * navigare ai dettagli di ogni zona.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import ZoneDetailSheet from '@/components/map/zone-detail-sheet';
import type { ForagingZone } from '@/lib/zone-engine';
import { getZoneStats } from '@/lib/zone-engine';
import { deleteZone, getZones, redetectZones, updateZone } from '@/lib/zone-store';
import { getFindings } from '@/lib/findings-store';

// ── Helpers ────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

function richnessBarColor(score: number): string {
  if (score >= 75) return '#D97706';
  if (score >= 50) return '#F59E0B';
  if (score >= 25) return '#22C55E';
  return '#9CA3AF';
}

function richnessLabel(score: number): string {
  if (score >= 75) return 'Eccellente';
  if (score >= 50) return 'Buona';
  if (score >= 25) return 'Discreta';
  return 'Scarsa';
}

function richnessBadgeStyle(score: number): React.CSSProperties {
  if (score >= 75) return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };
  if (score >= 50) return { background: '#FFF7ED', color: '#92400E', border: '1px solid #FCD34D' };
  if (score >= 25) return { background: '#F0FDF4', color: '#14532D', border: '1px solid #86EFAC' };
  return { background: '#F9FAFB', color: '#374151', border: '1px solid #D1D5DB' };
}

function formatLastVisited(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 30) return `${diffDays} giorni fa`;
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

// ── Zone Card component ────────────────────────────────────────────────

function ZoneCard({
  zone,
  index,
  onClick,
}: {
  zone: ForagingZone;
  index: number;
  onClick: () => void;
}) {
  const isGold = zone.richnessScore >= 75;
  const barColor = richnessBarColor(zone.richnessScore);
  const badgeStyle = richnessBadgeStyle(zone.richnessScore);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border transition-all hover:shadow-md active:scale-[0.99] overflow-hidden ${
        isGold
          ? 'border-amber-300 shadow-sm shadow-amber-100'
          : 'border-cream-300'
      }`}
    >
      {/* Gold shimmer header for top zones */}
      {isGold && (
        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, #F59E0B, #FFD700, #F59E0B)',
          }}
        />
      )}

      <div className="px-4 py-3.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {index === 0 && (
                <span className="text-base flex-shrink-0">🏆</span>
              )}
              <h3
                className={`font-bold truncate ${
                  isGold ? 'text-amber-800' : 'text-bark-800'
                } font-[family-name:var(--font-playfair)]`}
              >
                {zone.name}
              </h3>
            </div>
            <p className="text-xs text-bark-400 mt-0.5">
              {zone.totalFindings} ritrovament{zone.totalFindings === 1 ? 'o' : 'i'} ·{' '}
              {zone.uniqueSpecies.length} speci{zone.uniqueSpecies.length === 1 ? 'e' : 'e'} ·{' '}
              {formatLastVisited(zone.lastVisited)}
            </p>
          </div>

          <span
            className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
            style={badgeStyle}
          >
            {richnessLabel(zone.richnessScore)}
          </span>
        </div>

        {/* Richness bar */}
        <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${zone.richnessScore}%`,
              background: barColor,
            }}
          />
        </div>

        {/* Species chips */}
        {zone.uniqueSpecies.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {zone.uniqueSpecies.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] bg-cream-100 border border-cream-300 text-bark-600 px-2 py-0.5 rounded-full"
              >
                {s}
              </span>
            ))}
            {zone.uniqueSpecies.length > 3 && (
              <span className="text-[10px] text-bark-400">
                +{zone.uniqueSpecies.length - 3} altre
              </span>
            )}
          </div>
        )}

        {/* Best months mini-calendar */}
        <div className="flex gap-0.5">
          {MONTH_LABELS.map((m, i) => {
            const active = zone.bestMonths.includes(i + 1);
            return (
              <div
                key={m}
                className={`flex-1 text-center rounded text-[8px] font-bold py-0.5 ${
                  active
                    ? 'bg-forest-100 text-forest-700'
                    : 'text-bark-300'
                }`}
              >
                {m}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with score */}
      <div
        className={`px-4 py-2 flex items-center justify-between ${
          isGold ? 'bg-amber-50 border-t border-amber-100' : 'bg-cream-50 border-t border-cream-200'
        }`}
      >
        <span className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide">
          Indice di ricchezza
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: barColor }}
        >
          {zone.richnessScore} / 100
        </span>
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function ZonePage() {
  const [zones, setZones] = useState<ForagingZone[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ForagingZone | null>(null);
  const [findingsCount, setFindingsCount] = useState(0);

  const reload = useCallback(() => {
    const loaded = getZones();
    setZones(loaded);
    setFindingsCount(getFindings().length);
  }, []);

  useEffect(() => {
    reload();
    setIsLoaded(true);
  }, [reload]);

  const handleRedetect = useCallback(() => {
    setIsDetecting(true);
    // Small timeout to let UI update before heavy compute
    setTimeout(() => {
      const fresh = redetectZones();
      setZones(fresh);
      setIsDetecting(false);
    }, 50);
  }, []);

  const handleUpdateZone = useCallback(
    (id: string, updates: Partial<ForagingZone>) => {
      updateZone(id, updates);
      reload();
      // Update selected zone in sheet
      setSelectedZone((prev) =>
        prev?.id === id ? { ...prev, ...updates } : prev
      );
    },
    [reload]
  );

  const handleDeleteZone = useCallback(
    (id: string) => {
      deleteZone(id);
      setSelectedZone(null);
      reload();
    },
    [reload]
  );

  const stats = getZoneStats(zones);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream-50">
      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-[100] bg-forest-900/95 backdrop-blur-md border-b border-forest-700/50 h-14">
        <div className="max-w-lg mx-auto px-3 h-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🍄</span>
              <span className="text-sm font-bold text-white font-[family-name:var(--font-playfair)] hidden sm:block">
                CercaFungo
              </span>
            </Link>
            <span className="text-forest-600">/</span>
            <span className="text-sm font-semibold text-amber-400">Zone Floride</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mappa"
              className="text-xs text-forest-300 hover:text-white transition-colors font-medium"
            >
              Mappa
            </Link>
            <Link
              href="/scanner"
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scanner
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-3 pb-8">
        {/* ── Stats header ────────────────────────────────────────── */}
        {isLoaded && zones.length > 0 && (
          <div className="py-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-cream-300 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-bark-800">{stats.total}</p>
                <p className="text-[10px] text-bark-400 uppercase tracking-wide">Zone</p>
              </div>
              <div className="bg-white rounded-xl border border-cream-300 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.avgRichness}</p>
                <p className="text-[10px] text-bark-400 uppercase tracking-wide">Score medio</p>
              </div>
              <div className="bg-white rounded-xl border border-cream-300 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-forest-600">
                  {Array.from(
                    new Set(zones.flatMap((z) => z.uniqueSpecies))
                  ).length}
                </p>
                <p className="text-[10px] text-bark-400 uppercase tracking-wide">Specie</p>
              </div>
            </div>

            {stats.bestZone && (
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                    Zona migliore
                  </p>
                  <p className="font-bold text-amber-900 truncate">
                    {stats.bestZone.name}
                  </p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                  {stats.bestZone.richnessScore}/100
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Re-detect button ─────────────────────────────────────── */}
        <div className={`flex items-center justify-between ${zones.length > 0 ? 'pb-3' : 'py-4'}`}>
          {zones.length > 0 ? (
            <p className="text-xs text-bark-400">
              {zones.length} zon{zones.length === 1 ? 'a' : 'e'} da {findingsCount} ritrovamenti
            </p>
          ) : (
            <p className="text-sm font-medium text-bark-600">
              {findingsCount >= 2
                ? 'Clicca per rilevare le zone dai tuoi ritrovamenti'
                : 'Aggiungi almeno 2 ritrovamenti sulla mappa per rilevare le zone'}
            </p>
          )}

          <button
            onClick={handleRedetect}
            disabled={isDetecting || findingsCount < 2}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              findingsCount >= 2
                ? 'bg-forest-700 hover:bg-forest-600 text-white'
                : 'bg-cream-200 text-bark-400 cursor-not-allowed'
            }`}
          >
            {isDetecting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Rilevazione...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Rileva Zone
              </>
            )}
          </button>
        </div>

        {/* ── Zone list ─────────────────────────────────────────────── */}
        {isLoaded && (
          <>
            {zones.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-6xl mb-4">🗺️</span>
                <h2 className="text-xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-2">
                  Nessuna zona rilevata
                </h2>
                {findingsCount >= 2 ? (
                  <p className="text-bark-500 text-sm max-w-xs mb-6">
                    Hai {findingsCount} ritrovamenti. Clicca su &quot;Rileva Zone&quot; per
                    analizzare le aree dove hai trovato i funghi.
                  </p>
                ) : (
                  <p className="text-bark-500 text-sm max-w-xs mb-6">
                    Per rilevare le zone, aggiungi almeno 2 ritrovamenti sulla mappa.
                    Le zone si formano automaticamente quando trovi funghi in aree vicine.
                  </p>
                )}
                <Link
                  href="/mappa"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
                >
                  Vai alla Mappa
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {zones.map((zone, index) => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    index={index}
                    onClick={() => setSelectedZone(zone)}
                  />
                ))}

                {/* Footer hint */}
                <p className="text-center text-xs text-bark-400 pt-2 pb-4">
                  Le zone vengono rilevate automaticamente dai tuoi ritrovamenti.
                  <br />
                  Aggiungi nuovi ritrovamenti e usa &quot;Rileva Zone&quot; per aggiornare.
                </p>
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {!isLoaded && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <span className="text-4xl animate-bounce block mb-3">🍄</span>
              <p className="text-bark-400 text-sm">Caricamento zone...</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Zone detail sheet ────────────────────────────────────── */}
      <ZoneDetailSheet
        zone={selectedZone}
        onClose={() => setSelectedZone(null)}
        onUpdate={handleUpdateZone}
        onDelete={handleDeleteZone}
      />
    </div>
  );
}
