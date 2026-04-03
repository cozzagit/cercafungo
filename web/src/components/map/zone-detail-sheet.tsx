'use client';

/**
 * ZoneDetailSheet — Bottom sheet with full details of a foraging zone.
 *
 * Shows: zone name (editable), richness score bar, species list with
 * edibility badges, best-months calendar, last visited, navigation button,
 * privacy toggle, delete button.
 */

import { useState } from 'react';
import type { ForagingZone } from '@/lib/zone-engine';
import { SPECIES_DATABASE } from '@/lib/species-data';

// ── Types ──────────────────────────────────────────────────────────────

interface ZoneDetailSheetProps {
  zone: ForagingZone | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ForagingZone>) => void;
  onDelete: (id: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

function richnessConfig(score: number): {
  color: string;
  bg: string;
  border: string;
  label: string;
} {
  if (score >= 75)
    return { color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', label: 'Eccellente' };
  if (score >= 50)
    return { color: '#92400E', bg: '#FFF7ED', border: '#FCD34D', label: 'Buona' };
  if (score >= 25)
    return { color: '#14532D', bg: '#F0FDF4', border: '#86EFAC', label: 'Discreta' };
  return { color: '#374151', bg: '#F9FAFB', border: '#D1D5DB', label: 'Scarsa' };
}

function richnessBarColor(score: number): string {
  if (score >= 75) return '#D97706';
  if (score >= 50) return '#F59E0B';
  if (score >= 25) return '#22C55E';
  return '#9CA3AF';
}

function edibilityDot(speciesName: string): string {
  const lower = speciesName.toLowerCase();
  const match = SPECIES_DATABASE.find(
    (s) =>
      s.italianName.toLowerCase() === lower ||
      s.alternativeNames.some((alt) => alt.toLowerCase() === lower),
  );
  if (!match) return 'bg-amber-400';
  if (match.edibility === 'mortale') return 'bg-red-700';
  if (match.edibility === 'tossico') return 'bg-red-500';
  if (match.edibility === 'non_commestibile') return 'bg-gray-400';
  return 'bg-green-500';
}

function formatLastVisited(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function openNativeMaps(lat: number, lng: number): void {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?q=${lat},${lng}`
    : `https://maps.google.com/maps?q=${lat},${lng}`;
  window.open(url, '_blank');
}

// ── Component ──────────────────────────────────────────────────────────

export default function ZoneDetailSheet({
  zone,
  onClose,
  onUpdate,
  onDelete,
}: ZoneDetailSheetProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  if (!zone) return null;

  const richness = richnessConfig(zone.richnessScore);

  const handleStartEdit = () => {
    setNameValue(zone.name);
    setEditingName(true);
  };

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== zone.name) {
      onUpdate(zone.id, { name: trimmed });
    }
    setEditingName(false);
  };

  const handlePrivacyToggle = () => {
    onUpdate(zone.id, { isPrivate: !zone.isPrivate });
  };

  const handleDelete = () => {
    if (confirm(`Eliminare la zona "${zone.name}"? I ritrovamenti non verranno cancellati.`)) {
      onDelete(zone.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bark-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-cream-50 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-bark-200" />
        </div>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          className="px-5 pt-4 pb-3 border-b border-cream-200"
          style={{ background: richness.bg }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    className="flex-1 text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)] bg-white border border-bark-300 rounded-lg px-2 py-1 outline-none focus:border-forest-500"
                  />
                  <button
                    onClick={handleSaveName}
                    className="text-xs font-semibold text-forest-600 hover:text-forest-800 px-2 py-1 bg-white rounded-lg border border-forest-300"
                  >
                    Salva
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)] leading-tight truncate">
                    {zone.name}
                  </h2>
                  <button
                    onClick={handleStartEdit}
                    title="Rinomina zona"
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-white/60 hover:bg-white text-bark-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: richness.border, color: richness.color }}
                >
                  {richness.label}
                </span>
                {zone.isPrivate && (
                  <span className="text-xs text-bark-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Privata
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-bark-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-4">

          {/* Richness score bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide">
                Indice di Ricchezza
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: richnessBarColor(zone.richnessScore) }}
              >
                {zone.richnessScore} / 100
              </span>
            </div>
            <div className="w-full h-3 bg-cream-300 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${zone.richnessScore}%`,
                  background: richnessBarColor(zone.richnessScore),
                }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ritrovamenti', value: String(zone.totalFindings) },
              { label: 'Specie', value: String(zone.uniqueSpecies.length) },
              { label: 'Raggio', value: `${zone.radiusMeters}m` },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border border-cream-300 px-2 py-2.5 text-center"
              >
                <p className="text-base font-bold text-bark-800">{s.value}</p>
                <p className="text-[10px] text-bark-400 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Species list */}
          {zone.uniqueSpecies.length > 0 && (
            <div className="bg-white rounded-xl border border-cream-300 px-3 py-3">
              <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide mb-2">
                Specie trovate
              </p>
              <div className="flex flex-wrap gap-1.5">
                {zone.uniqueSpecies.map((species) => (
                  <div key={species} className="flex items-center gap-1.5 bg-cream-100 border border-cream-300 rounded-full pl-2 pr-3 py-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${edibilityDot(species)}`} />
                    <span className="text-xs font-medium text-bark-700">{species}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best months calendar */}
          <div className="bg-white rounded-xl border border-cream-300 px-3 py-3">
            <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide mb-2">
              Mesi migliori
            </p>
            <div className="grid grid-cols-6 gap-1">
              {MONTH_LABELS.map((label, i) => {
                const active = zone.bestMonths.includes(i + 1);
                return (
                  <div
                    key={label}
                    className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-center transition-all ${
                      active
                        ? 'bg-forest-100 border border-forest-300'
                        : 'bg-cream-100 border border-cream-200'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold ${
                        active ? 'text-forest-700' : 'text-bark-400'
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        active ? 'bg-forest-500' : 'bg-transparent'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last visited + GPS coords */}
          <div className="bg-white rounded-xl border border-cream-300 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide">
                  Ultimo ritrovamento
                </p>
                <p className="text-sm font-semibold text-bark-800 mt-0.5">
                  {formatLastVisited(zone.lastVisited)}
                </p>
              </div>
              <svg className="w-5 h-5 text-bark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide">
                Centro zona
              </p>
              <p className="text-xs font-mono text-bark-600 mt-0.5">
                {zone.centerLat.toFixed(5)}°N, {zone.centerLng.toFixed(5)}°E
              </p>
            </div>
          </div>

          {/* Privacy toggle */}
          <div className="bg-white rounded-xl border border-cream-300 px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-bark-700">Zona Privata</p>
              <p className="text-xs text-bark-400 mt-0.5">
                {zone.isPrivate
                  ? 'Non condivisa con la community (futura feature)'
                  : 'Visibile nella community (futura feature)'}
              </p>
            </div>
            <button
              onClick={handlePrivacyToggle}
              role="switch"
              aria-checked={zone.isPrivate}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                zone.isPrivate ? 'bg-forest-600' : 'bg-cream-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  zone.isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Safety reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-700">
              Le zone sono calcolate automaticamente dai tuoi ritrovamenti. Consulta sempre
              un esperto prima di raccogliere.
            </p>
          </div>
        </div>

        {/* ── Footer actions ────────────────────────────────────────── */}
        <div className="px-5 pb-6 pt-2 grid grid-cols-2 gap-3 border-t border-cream-200 bg-cream-50 sticky bottom-0">
          <button
            onClick={() => openNativeMaps(zone.centerLat, zone.centerLng)}
            className="flex items-center justify-center gap-2 py-3 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-xl text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Naviga qui
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-sm border border-red-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Elimina zona
          </button>
        </div>
      </div>
    </div>
  );
}
