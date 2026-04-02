'use client';

import type { SpeciesCondition } from '@/lib/weather-service';

interface SpeciesForecastProps {
  species: SpeciesCondition[];
}

function CheckIcon({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <svg
        className="w-4 h-4 text-emerald-400 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-4 h-4 text-red-400 flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpeciesCard({ species }: { species: SpeciesCondition }) {
  const okCount = species.factors.filter((f) => f.ok).length;
  const totalCount = species.factors.length;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        species.favorable
          ? 'bg-forest-800/60 border-forest-600/50 shadow-lg shadow-forest-900/30'
          : 'bg-bark-800/40 border-bark-700/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{species.emoji}</span>
          <div>
            <h3 className="font-semibold text-white font-[family-name:var(--font-playfair)]">
              {species.name}
            </h3>
            <p className="text-xs text-white/50 mt-0.5">{species.habitatNote}</p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            species.favorable
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border border-red-500/20'
          }`}
        >
          {species.favorable ? 'Probabilità alta' : 'Non ideale oggi'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>Condizioni favorevoli</span>
          <span>
            {okCount}/{totalCount}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              species.favorable ? 'bg-emerald-500' : 'bg-amber-500/70'
            }`}
            style={{ width: `${(okCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Factor checklist */}
      <ul className="space-y-2 mb-4">
        {species.factors.map((factor) => (
          <li key={factor.label} className="flex items-start gap-2">
            <CheckIcon ok={factor.ok} />
            <div className="min-w-0">
              <span className="text-xs font-medium text-white/80">
                {factor.label}:
              </span>{' '}
              <span className="text-xs text-white/50">{factor.note}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Altitude recommendation */}
      <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
        <svg
          className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
        <p className="text-xs text-white/60 leading-relaxed">
          {species.altitudeRecommendation}
        </p>
      </div>
    </div>
  );
}

export function SpeciesForecast({ species }: SpeciesForecastProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {species.map((s) => (
        <SpeciesCard key={s.id} species={s} />
      ))}
    </div>
  );
}
