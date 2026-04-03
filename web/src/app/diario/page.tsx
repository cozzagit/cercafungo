'use client';

/**
 * Diario del Cercatore — CercaFungo
 *
 * List of past foraging sessions, global stats, and CTA to start a new outing.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ActiveSessionBar } from '@/components/diary/active-session-bar';
import { SessionCard } from '@/components/diary/session-card';
import {
  getAllSessions,
  getActiveSession,
  getDiaryStats,
  startSession,
  formatDuration,
  type ForagingSession,
  type DiaryStats,
} from '@/lib/diary-store';
import { getGeolocation, getWeatherForecast } from '@/lib/weather-service';

// ── Month filter ──────────────────────────────────────────────────────────────

const MONTHS = [
  'Tutti i mesi',
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const SEASONS = [
  { value: 'tutte', label: 'Tutte le stagioni' },
  { value: 'primavera', label: '🌸 Primavera' },
  { value: 'estate', label: '☀️ Estate' },
  { value: 'autunno', label: '🍂 Autunno' },
  { value: 'inverno', label: '❄️ Inverno' },
];

function getSessionSeason(isoDate: string): string {
  const month = new Date(isoDate).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'primavera';
  if (month >= 6 && month <= 8) return 'estate';
  if (month >= 9 && month <= 11) return 'autunno';
  return 'inverno';
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-b from-cream-50 to-cream-100/50 rounded-2xl border border-cream-400/50 shadow-sm p-4 flex flex-col items-center gap-1.5">
      <div className="text-forest-600">{icon}</div>
      <p className="text-xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">{value}</p>
      <p className="text-xs text-bark-400 font-medium text-center">{label}</p>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function BackpackIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6a2 2 0 012 2v1H7V5a2 2 0 012-2zM5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <circle cx="12" cy="11" r="3" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 003 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-.601-.062-1.187-.18-1.754" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DiarioPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<ForagingSession[]>([]);
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [activeSession, setActiveSession] = useState<ForagingSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState(0); // 0 = all
  const [filterSeason, setFilterSeason] = useState('tutte');

  // Starting session state
  const [isStarting, setIsStarting] = useState(false);

  const reload = useCallback(() => {
    setSessions(getAllSessions());
    setStats(getDiaryStats());
    setActiveSession(getActiveSession());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (filterMonth > 0) {
      const month = new Date(s.startedAt).getMonth() + 1;
      if (month !== filterMonth) return false;
    }
    if (filterSeason !== 'tutte') {
      if (getSessionSeason(s.startedAt) !== filterSeason) return false;
    }
    return true;
  });

  // Start new session
  async function handleStartSession() {
    setIsStarting(true);
    try {
      let weatherSnapshot = null;
      try {
        const location = await getGeolocation();
        const forecast = await getWeatherForecast(location);
        weatherSnapshot = {
          temp: Math.round(forecast.data.current.temperature),
          humidity: forecast.data.current.humidity,
          conditions: forecast.fungoScore.message,
        };
      } catch {
        // GPS or weather unavailable — continue without it
      }

      const session = startSession(weatherSnapshot ?? undefined);
      router.push('/diario/sessione');
    } catch {
      setIsStarting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <span className="text-4xl animate-bounce">🍄</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream-50/90 backdrop-blur-md border-b border-cream-400">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-2xl">🍄</span>
              <span className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
                CercaFungo
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/guida" className="text-sm text-bark-400 hover:text-bark-700 transition-colors font-medium hidden sm:block">
                Guida
              </Link>
              <Link href="/mappa" className="text-sm text-bark-400 hover:text-bark-700 transition-colors font-medium hidden sm:block">
                Mappa
              </Link>
              <Link href="/condizioni" className="text-sm text-bark-400 hover:text-bark-700 transition-colors font-medium hidden sm:block">
                Condizioni
              </Link>
              <span className="text-sm text-forest-600 font-semibold">
                Diario
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-forest-100 rounded-xl text-forest-600">
              <BackpackIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
                Diario del Cercatore
              </h1>
              <p className="text-sm text-bark-400">Le tue uscite nel bosco</p>
            </div>
          </div>
        </div>

        {/* Active session banner */}
        {activeSession && (
          <Link href="/diario/sessione">
            <div className="mb-6 p-4 bg-forest-800 rounded-2xl border border-forest-600/50 flex items-center justify-between gap-4 cursor-pointer hover:bg-forest-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{activeSession.title}</p>
                  <p className="text-xs text-forest-300">Uscita in corso — tocca per tornare</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-forest-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}

        {/* CTA — Start new session */}
        {!activeSession && (
          <div className="mb-8">
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="w-full py-5 bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white rounded-2xl font-bold text-lg shadow-lg shadow-forest-700/30 hover:shadow-forest-700/50 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-3"
            >
              {isStarting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Preparando l'uscita...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Inizia Uscita
                </>
              )}
            </button>
            <p className="text-center text-xs text-bark-400 mt-2">
              Registra il percorso GPS e i ritrovamenti in tempo reale
            </p>
          </div>
        )}

        {/* Stats summary */}
        {stats && stats.totalSessions > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
              Le tue statistiche
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Uscite totali"
                value={String(stats.totalSessions)}
                icon={<BackpackIcon />}
              />
              <StatCard
                label="Km percorsi"
                value={`${stats.totalKm} km`}
                icon={<MapPinIcon />}
              />
              <StatCard
                label="Ritrovamenti"
                value={String(stats.totalFindings)}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C7.029 3 3 7.029 3 12h18c0-4.971-4.029-9-9-9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12v5a4 4 0 008 0v-5" />
                  </svg>
                }
              />
              <StatCard
                label="Mese migliore"
                value={stats.bestMonth ?? '—'}
                icon={<CalendarIcon />}
              />
            </div>
            {stats.uniqueSpecies.length > 0 && (
              <div className="mt-3 p-3.5 bg-forest-50 rounded-xl border border-forest-200/60">
                <p className="text-xs text-forest-600 font-medium mb-2">
                  🍄 {stats.uniqueSpecies.length} specie trovate:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.uniqueSpecies.map((sp) => (
                    <span key={sp} className="text-xs px-2 py-0.5 bg-forest-100 text-forest-700 rounded-full border border-forest-200/60">
                      {sp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session list */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider">
              Uscite passate {filteredSessions.length > 0 && `(${filteredSessions.length})`}
            </h2>

            {sessions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Month filter */}
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="text-xs border border-cream-400 rounded-lg px-2.5 py-1.5 bg-cream-50 text-bark-600 focus:outline-none focus:ring-2 focus:ring-forest-500"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>

                {/* Season filter */}
                <select
                  value={filterSeason}
                  onChange={(e) => setFilterSeason(e.target.value)}
                  className="text-xs border border-cream-400 rounded-lg px-2.5 py-1.5 bg-cream-50 text-bark-600 focus:outline-none focus:ring-2 focus:ring-forest-500"
                >
                  {SEASONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Empty state */}
          {sessions.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌲</div>
              <h3 className="text-lg font-semibold text-bark-700 font-[family-name:var(--font-playfair)] mb-2">
                Il bosco ti aspetta
              </h3>
              <p className="text-bark-400 text-sm mb-6 max-w-sm mx-auto">
                Non hai ancora registrato nessuna uscita. Premi il tasto qui sopra per iniziare la tua prima avventura nel bosco.
              </p>
            </div>
          )}

          {/* Filtered empty */}
          {sessions.length > 0 && filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-bark-400 text-sm">
                Nessuna uscita trovata con i filtri selezionati.
              </p>
              <button
                onClick={() => { setFilterMonth(0); setFilterSeason('tutte'); }}
                className="mt-3 text-forest-600 text-sm font-medium hover:underline"
              >
                Rimuovi filtri
              </button>
            </div>
          )}

          {/* Session cards */}
          {filteredSessions.length > 0 && (
            <div className="flex flex-col gap-4">
              {filteredSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Active session bar — fixed bottom, shows only when a session is running */}
      <ActiveSessionBar />
    </div>
  );
}
