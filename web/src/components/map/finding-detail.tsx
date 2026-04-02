'use client';

/**
 * FindingDetail — Bottom sheet showing full details of a mushroom finding.
 *
 * Shows species info, GPS coordinates, photo, date, weather, notes.
 * Actions: delete, share coordinates.
 */

import type { MushroomFinding } from '@/lib/findings-store';

// ── Types ──────────────────────────────────────────────────────────

interface FindingDetailProps {
  finding: MushroomFinding | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onFocusOnMap: (finding: MushroomFinding) => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function edibilityConfig(edibility: MushroomFinding['edibility']) {
  switch (edibility) {
    case 'commestibile':
      return {
        label: 'Commestibile',
        color: 'text-green-700',
        bg: 'bg-green-100 border-green-200',
        dot: 'bg-green-500',
      };
    case 'tossico':
      return {
        label: 'Tossico / Non commestibile',
        color: 'text-red-700',
        bg: 'bg-red-100 border-red-200',
        dot: 'bg-red-500',
      };
    default:
      return {
        label: 'Specie sconosciuta',
        color: 'text-amber-700',
        bg: 'bg-amber-100 border-amber-200',
        dot: 'bg-amber-500',
      };
  }
}

function seasonLabel(season: MushroomFinding['season']): string {
  const map: Record<MushroomFinding['season'], string> = {
    primavera: '🌸 Primavera',
    estate: '☀️ Estate',
    autunno: '🍂 Autunno',
    inverno: '❄️ Inverno',
  };
  return map[season];
}

function shareCoordinates(finding: MushroomFinding): void {
  const text = `🍄 ${finding.speciesName} trovato il ${formatDate(finding.date)}\n📍 ${finding.lat.toFixed(5)}, ${finding.lng.toFixed(5)}${finding.altitude ? ` (${finding.altitude}m s.l.m.)` : ''}\n\nApri in Google Maps: https://maps.google.com/maps?q=${finding.lat},${finding.lng}`;

  if (navigator.share) {
    navigator.share({ title: `Ritrovamento — ${finding.speciesName}`, text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).then(() => {
      alert('Coordinate copiate negli appunti!');
    }).catch(() => {
      prompt('Copia le coordinate:', text);
    });
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function FindingDetail({
  finding,
  onClose,
  onDelete,
  onFocusOnMap,
}: FindingDetailProps) {
  if (!finding) return null;

  const edibility = edibilityConfig(finding.edibility);
  const hasConfidence = finding.confidence != null;

  const handleDelete = () => {
    if (confirm(`Eliminare il ritrovamento di ${finding.speciesName}? L'azione non è reversibile.`)) {
      onDelete(finding.id);
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
      <div className="relative bg-cream-50 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-bark-200" />
        </div>

        {/* Photo header (if available) */}
        {finding.photoDataUrl ? (
          <div className="relative h-52 overflow-hidden rounded-t-3xl sm:rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={finding.photoDataUrl}
              alt={`Foto di ${finding.speciesName}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bark-900/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-bark-900/60 hover:bg-bark-900/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-3 left-4">
              <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">
                {finding.speciesName}
              </h2>
              {finding.scientificName && (
                <p className="text-sm text-cream-200 italic">{finding.scientificName}</p>
              )}
            </div>
          </div>
        ) : (
          /* No photo — plain header */
          <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300">
            <div>
              <h2 className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
                {finding.speciesName}
              </h2>
              {finding.scientificName && (
                <p className="text-sm text-bark-400 italic">{finding.scientificName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-cream-200 hover:bg-cream-300 text-bark-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Edibility badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${edibility.bg} ${edibility.color}`}>
            <span className={`w-2 h-2 rounded-full ${edibility.dot}`} />
            {edibility.label}
          </div>

          {/* AI confidence */}
          {hasConfidence && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-bark-500 uppercase tracking-wide">Confidenza AI</span>
                <span
                  className={`text-sm font-bold ${
                    finding.confidence! >= 70
                      ? 'text-green-600'
                      : finding.confidence! >= 40
                      ? 'text-amber-600'
                      : 'text-red-500'
                  }`}
                >
                  {finding.confidence}%
                </span>
              </div>
              <div className="w-full h-2 bg-cream-300 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    finding.confidence! >= 70
                      ? 'bg-green-500'
                      : finding.confidence! >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${finding.confidence}%` }}
                />
              </div>
            </div>
          )}

          {/* Date / Season */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-cream-300 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide mb-0.5">Data</p>
              <p className="text-sm font-semibold text-bark-800">{formatDate(finding.date)}</p>
              <p className="text-xs text-bark-400">{formatTime(finding.date)}</p>
            </div>
            <div className="bg-white rounded-xl border border-cream-300 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide mb-0.5">Stagione</p>
              <p className="text-sm font-semibold text-bark-800">{seasonLabel(finding.season)}</p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-cream-300 px-3 py-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide">Coordinate GPS</p>
                  <p className="text-sm font-mono text-bark-800 mt-0.5">
                    {finding.lat.toFixed(5)}°N, {finding.lng.toFixed(5)}°E
                  </p>
                  {finding.altitude && (
                    <p className="text-xs text-bark-400">{finding.altitude} m s.l.m.</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onFocusOnMap(finding)}
                className="text-[10px] bg-forest-100 hover:bg-forest-200 text-forest-700 px-2 py-1 rounded-lg font-semibold transition-colors flex-shrink-0"
              >
                Mostra
              </button>
            </div>
          </div>

          {/* Weather */}
          {finding.weather && (
            <div className="bg-white rounded-xl border border-cream-300 px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-base">⛅</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide">Meteo</p>
                <p className="text-sm font-semibold text-bark-800">
                  {finding.weather.condition}
                  {finding.weather.tempC != null && ` · ${finding.weather.tempC}°C`}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {finding.notes && (
            <div className="bg-white rounded-xl border border-cream-300 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-bark-400 uppercase tracking-wide mb-1">Note</p>
              <p className="text-sm text-bark-700 leading-relaxed">{finding.notes}</p>
            </div>
          )}

          {/* Safety reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-700">
              Consulta sempre un esperto o l&apos;ASL prima di consumare funghi raccolti.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-6 pt-2 grid grid-cols-2 gap-3 border-t border-cream-200 bg-cream-50 sticky bottom-0">
          <button
            onClick={() => shareCoordinates(finding)}
            className="flex items-center justify-center gap-2 py-3 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-xl text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Condividi
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-sm border border-red-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}
