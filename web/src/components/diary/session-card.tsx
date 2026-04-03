'use client';

import Link from 'next/link';
import { type ForagingSession, formatDistance, formatDuration } from '@/lib/diary-store';

interface SessionCardProps {
  session: ForagingSession;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? 'text-amber-500' : 'text-cream-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function MushroomIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C7.029 3 3 7.029 3 12h18c0-4.971-4.029-9-9-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12v5a4 4 0 008 0v-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function PathIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3m0 0a3 3 0 013-3m-3 3a3 3 0 003 3m9-3h3m-3 0a3 3 0 01-3 3m3-3a3 3 0 00-3-3m-3 6v3m0-12V3" />
    </svg>
  );
}

export function SessionCard({ session }: SessionCardProps) {
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dayStr = date.toLocaleDateString('it-IT', { weekday: 'long' });
  const capitalDay = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);

  const speciesPreview = session.speciesFound.slice(0, 3);
  const extraSpecies = session.speciesFound.length - 3;

  return (
    <Link href={`/diario/${session.id}`}>
      <div className="group bg-gradient-to-b from-cream-50 to-cream-100/50 rounded-2xl border border-cream-400/50 shadow-sm hover:shadow-lg hover:shadow-bark-200/30 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden">
        {/* Top accent line based on findings count */}
        <div
          className="h-1 w-full"
          style={{
            background:
              session.findings.length >= 5
                ? 'linear-gradient(90deg, #4a7c2e, #8ab775)'
                : session.findings.length >= 2
                ? 'linear-gradient(90deg, #c68b3e, #e5b465)'
                : 'linear-gradient(90deg, #b39a78, #d1bfa5)',
          }}
        />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-bark-400 font-medium mb-0.5">{capitalDay}</p>
              <h3 className="text-base font-semibold text-bark-800 font-[family-name:var(--font-playfair)] leading-tight group-hover:text-forest-700 transition-colors">
                {session.title}
              </h3>
              <p className="text-xs text-bark-400 mt-0.5">{dateStr}</p>
            </div>
            <div className="shrink-0">
              {session.rating > 0 ? (
                <StarRating rating={session.rating} />
              ) : (
                <span className="text-xs text-bark-300 italic">Non valutata</span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-bark-500">
              <ClockIcon />
              <span className="text-sm font-medium">{formatDuration(session.durationMinutes)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-bark-500">
              <PathIcon />
              <span className="text-sm font-medium">{formatDistance(session.distanceMeters)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-forest-600">
              <MushroomIcon />
              <span className="text-sm font-medium">
                {session.findings.length} {session.findings.length === 1 ? 'ritrovamento' : 'ritrovamenti'}
              </span>
            </div>
          </div>

          {/* Species tags */}
          {speciesPreview.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {speciesPreview.map((sp) => (
                <span
                  key={sp}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest-100 text-forest-700 text-xs font-medium rounded-full border border-forest-200/60"
                >
                  🍄 {sp}
                </span>
              ))}
              {extraSpecies > 0 && (
                <span className="text-xs text-bark-400">+{extraSpecies} altre</span>
              )}
            </div>
          )}

          {session.findings.length === 0 && (
            <p className="text-xs text-bark-300 italic">Nessun ritrovamento registrato</p>
          )}
        </div>

        {/* Weather strip if available */}
        {session.weatherSnapshot && (
          <div className="px-5 py-2.5 bg-cream-200/60 border-t border-cream-400/40 flex items-center gap-3 text-xs text-bark-500">
            <span>🌡 {session.weatherSnapshot.temp}°C</span>
            <span>💧 {session.weatherSnapshot.humidity}%</span>
            <span className="capitalize">{session.weatherSnapshot.conditions}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
