'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FungoScoreGauge } from '@/components/weather/fungo-score';
import { SpeciesForecast } from '@/components/weather/species-forecast';
import { Footer } from '@/components/landing/footer';
import {
  getGeolocation,
  getWeatherForecast,
  clearWeatherCache,
  type WeatherForecast,
  type GeoLocation,
} from '@/lib/weather-service';
import { getMoonPhase } from '@/lib/moon-phase';

// ─── Types ──────────────────────────────────────────────────────────────────

type PageState =
  | 'idle'
  | 'locating'
  | 'fetching'
  | 'ready'
  | 'location-denied'
  | 'error';

// ─── Weather icons (SVG) ───────────────────────────────────────────────────

function TempIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V3m0 0a3 3 0 110 6m0-6a3 3 0 100 6m0 9a6 6 0 100-12 6 6 0 000 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
  );
}

function HumidityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
    </svg>
  );
}

function SoilIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ─── Score color helpers ───────────────────────────────────────────────────

function scoreToBg(score: number): string {
  if (score >= 90) return 'bg-yellow-500/20 border-yellow-500/40';
  if (score >= 70) return 'bg-emerald-500/20 border-emerald-500/40';
  if (score >= 55) return 'bg-green-500/15 border-green-500/30';
  if (score >= 35) return 'bg-amber-500/15 border-amber-500/30';
  if (score >= 20) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

function scoreToText(score: number): string {
  if (score >= 90) return 'text-yellow-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 55) return 'text-green-400';
  if (score >= 35) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function WeatherStatCard({
  icon,
  label,
  value,
  unit,
  color = 'text-amber-300',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-4 bg-white/5 rounded-2xl border border-white/10">
      <div className={`${color} mb-0.5`}>{icon}</div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-white leading-none">{value}</span>
        {unit && <span className="text-sm text-white/50 mb-0.5">{unit}</span>}
      </div>
      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
}

function DayForecastCard({
  dayName,
  date,
  score,
  label,
  isToday,
  isBest,
}: {
  dayName: string;
  date: string;
  score: number;
  label: string;
  isToday: boolean;
  isBest: boolean;
}) {
  const d = new Date(date + 'T12:00:00');
  const day = d.getDate();
  const month = d.getMonth() + 1;

  return (
    <div
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
        isToday
          ? 'bg-forest-700/60 border-forest-500/60 shadow-lg'
          : 'bg-white/5 border-white/10'
      }`}
    >
      {isBest && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
          Miglior giorno
        </span>
      )}
      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
        {isToday ? 'Oggi' : dayName}
      </span>
      <span className="text-xs text-white/30">{`${day}/${month}`}</span>

      {/* Score circle */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
          score >= 70
            ? 'border-emerald-500 text-emerald-400'
            : score >= 55
            ? 'border-green-500 text-green-400'
            : score >= 35
            ? 'border-amber-500 text-amber-400'
            : 'border-red-500/60 text-red-400'
        }`}
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        {score}
      </div>

      <span
        className={`text-xs capitalize font-medium ${scoreToText(score)}`}
      >
        {label}
      </span>
    </div>
  );
}

function MoonWidget({ date = new Date() }: { date?: Date }) {
  const phase = getMoonPhase(date);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-900/60 to-slate-900/60 border border-indigo-700/40 p-6">
      <div className="flex items-start gap-5">
        {/* Moon emoji big */}
        <div className="text-5xl flex-shrink-0 leading-none">{phase.emoji}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white font-[family-name:var(--font-playfair)]">
              {phase.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                phase.isWaning
                  ? 'bg-indigo-500/30 text-indigo-300'
                  : 'bg-violet-500/30 text-violet-300'
              }`}
            >
              {phase.isWaning ? 'Calante' : 'Crescente'}
            </span>
          </div>

          {/* Illumination bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Illuminazione</span>
              <span>{phase.illumination}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${phase.illumination}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-white/60 leading-relaxed italic">
            &ldquo;{phase.wisdom}&rdquo;
          </p>
        </div>
      </div>

      {/* Favorable indicator */}
      <div
        className={`mt-4 flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl ${
          phase.isWaning
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-amber-500/10 text-amber-300'
        }`}
      >
        <span>{phase.isWaning ? '✓' : '○'}</span>
        <span>
          {phase.isWaning
            ? 'Luna calante: favorevole per la raccolta secondo la tradizione'
            : 'Luna crescente: aspetta la fase calante per il meglio'}
        </span>
      </div>
    </div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────

function LoadingOverlay({ state }: { state: PageState }) {
  const messages: Record<string, string> = {
    locating: 'Ricerca della tua posizione...',
    fetching: 'Scarico i dati meteo dal bosco...',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="relative">
        <span className="text-6xl animate-bounce">🍄</span>
        <div className="absolute -inset-4 border-2 border-forest-500/30 rounded-full animate-ping" />
      </div>
      <p className="text-forest-200 text-lg">
        {messages[state] ?? 'Caricamento...'}
      </p>
      <p className="text-white/30 text-sm">
        Dati meteo forniti da Open-Meteo (gratuito)
      </p>
    </div>
  );
}

// ─── Error states ──────────────────────────────────────────────────────────

function LocationDenied({ onUseFallback }: { onUseFallback: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 max-w-md mx-auto py-16 px-4">
      <span className="text-5xl">📍</span>
      <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">
        Posizione non disponibile
      </h2>
      <p className="text-white/60 text-sm leading-relaxed">
        Per mostrare le condizioni meteo del tuo bosco, CercaFungo ha bisogno
        di accedere alla tua posizione. Puoi abilitarla nelle impostazioni del
        browser.
      </p>
      <button
        onClick={onUseFallback}
        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors text-sm"
      >
        Usa posizione Valtellina (default)
      </button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5 max-w-md mx-auto py-16 px-4">
      <span className="text-5xl">⛈️</span>
      <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">
        Errore nel caricamento
      </h2>
      <p className="text-white/60 text-sm leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-forest-600 hover:bg-forest-500 text-white rounded-xl font-semibold transition-colors text-sm"
      >
        Riprova
      </button>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-forest-900/90 backdrop-blur-md border-b border-forest-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🍄</span>
            <span className="text-lg font-bold text-white font-[family-name:var(--font-playfair)]">
              CercaFungo
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/guida"
              className="text-sm text-forest-200 hover:text-white transition-colors font-medium hidden sm:block"
            >
              Guida Specie
            </Link>
            <Link
              href="/condizioni"
              className="text-sm text-amber-300 font-semibold hidden sm:block"
            >
              Condizioni
            </Link>
            <Link
              href="/scanner"
              className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-amber-500/20"
            >
              Scanner
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

// Fallback location: Sondrio, Valtellina
const VALTELLINA_FALLBACK: GeoLocation = { latitude: 46.1697, longitude: 9.8682 };

export default function CondizioniPage() {
  const [pageState, setPageState] = useState<PageState>('idle');
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function loadData(loc: GeoLocation) {
    setPageState('fetching');
    try {
      const data = await getWeatherForecast(loc);
      setForecast(data);
      setLastUpdate(new Date());
      setPageState('ready');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Impossibile caricare i dati meteo. Controlla la connessione.'
      );
      setPageState('error');
    }
  }

  async function init() {
    setPageState('locating');
    try {
      const loc = await getGeolocation();
      setLocation(loc);
      await loadData(loc);
    } catch {
      setPageState('location-denied');
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    if (!location) return;
    clearWeatherCache();
    await loadData(location);
  }

  async function handleUseFallback() {
    setLocation(VALTELLINA_FALLBACK);
    await loadData(VALTELLINA_FALLBACK);
  }

  const showLoader = pageState === 'locating' || pageState === 'fetching';

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-forest-900 text-white">
        {/* Hero header */}
        <div className="relative overflow-hidden bg-gradient-to-b from-forest-800 to-forest-900 py-14">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-forest-400/5 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Breadcrumb */}
            <div className="flex items-center justify-center gap-2 text-sm text-white/40 mb-6">
              <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white/60">Condizioni Meteo</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-playfair)] mb-4">
              Condizioni <span className="text-amber-400">Ideali</span>
            </h1>
            <p className="text-forest-200 max-w-xl mx-auto text-lg leading-relaxed">
              Il meteo decide il raccolto. Scopri se oggi è il giorno giusto per
              uscire nel bosco.
            </p>

            {/* Location + last update info */}
            {pageState === 'ready' && forecast && (
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>
                    {location
                      ? `${location.latitude.toFixed(3)}°N, ${location.longitude.toFixed(3)}°E`
                      : 'Valtellina (default)'}
                  </span>
                </div>
                {lastUpdate && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Aggiornato{' '}
                      {lastUpdate.toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1 text-xs text-forest-300 hover:text-white transition-colors"
                >
                  <RefreshIcon />
                  Aggiorna
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Loading */}
          {showLoader && <LoadingOverlay state={pageState} />}

          {/* Location denied */}
          {pageState === 'location-denied' && (
            <LocationDenied onUseFallback={handleUseFallback} />
          )}

          {/* Error */}
          {pageState === 'error' && (
            <ErrorState
              message={errorMessage}
              onRetry={() => location ? loadData(location) : init()}
            />
          )}

          {/* Ready state */}
          {pageState === 'ready' && forecast && (
            <div className="space-y-12">

              {/* === SECTION 1: Fungo Score + Current Conditions === */}
              <section>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {/* Left — Score gauge */}
                  <div className="rounded-3xl bg-gradient-to-br from-forest-800/80 to-forest-900 border border-forest-600/40 p-8 shadow-2xl">
                    <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)] mb-2 text-center">
                      Fungo Score
                    </h2>
                    <p className="text-sm text-white/40 text-center mb-8">
                      Indice di probabilità raccolta funghi oggi
                    </p>

                    <FungoScoreGauge fungoScore={forecast.fungoScore} />

                    {/* Recommendation */}
                    <div
                      className={`mt-8 p-4 rounded-2xl border text-center ${scoreToBg(forecast.fungoScore.score)}`}
                    >
                      <p className="text-sm leading-relaxed text-white/80">
                        {forecast.fungoScore.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Right — Current conditions */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)] mb-1">
                        Condizioni Attuali
                      </h2>
                      <p className="text-sm text-white/40">
                        Meteo in tempo reale tramite Open-Meteo
                      </p>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <WeatherStatCard
                        icon={<TempIcon />}
                        label="Temperatura aria"
                        value={forecast.data.current.temperature.toFixed(1)}
                        unit="°C"
                        color="text-red-400"
                      />
                      <WeatherStatCard
                        icon={<HumidityIcon />}
                        label="Umidità relativa"
                        value={Math.round(forecast.data.current.humidity)}
                        unit="%"
                        color="text-blue-400"
                      />
                      <WeatherStatCard
                        icon={<RainIcon />}
                        label="Pioggia ultime 72h"
                        value={forecast.data.past3DaysPrecipitation.toFixed(1)}
                        unit="mm"
                        color="text-sky-400"
                      />
                      <WeatherStatCard
                        icon={<SoilIcon />}
                        label="Temperatura suolo"
                        value={forecast.data.current.soilTemperature.toFixed(1)}
                        unit="°C"
                        color="text-amber-400"
                      />
                    </div>

                    {/* Rain context */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60 flex items-center gap-1.5">
                          <RainIcon />
                          Piogge ultime 72 ore
                        </span>
                        <span className="font-semibold text-sky-300">
                          {forecast.data.past3DaysPrecipitation.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, (forecast.data.past3DaysPrecipitation / 50) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-white/40">
                        {forecast.data.past3DaysPrecipitation < 5
                          ? 'Troppo secco — i funghi hanno bisogno di pioggia'
                          : forecast.data.past3DaysPrecipitation <= 30
                          ? 'Ottimo — range ideale per i porcini (10-30mm)'
                          : forecast.data.past3DaysPrecipitation <= 50
                          ? 'Buono — un po\' abbondante ma ancora favorevole'
                          : 'Troppa pioggia — attendere che il terreno si asciughi un po\''}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* === SECTION 2: 3-Day Forecast === */}
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-playfair)] mb-1">
                    Previsioni 4 Giorni
                  </h2>
                  <p className="text-sm text-white/40">
                    Fungo Score stimato per i prossimi giorni
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {forecast.dailyScores.map((day, i) => (
                    <DayForecastCard
                      key={day.date}
                      dayName={day.dayName}
                      date={day.date}
                      score={day.score}
                      label={day.label}
                      isToday={i === 0}
                      isBest={i === forecast.bestDayIndex && forecast.bestDayIndex !== 0}
                    />
                  ))}
                </div>

                {/* Best day advice */}
                {forecast.bestDayIndex > 0 ? (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                    <p className="text-sm text-amber-200 leading-relaxed">
                      <strong>
                        {forecast.dailyScores[forecast.bestDayIndex]?.dayName} sarà il giorno migliore
                      </strong>{' '}
                      della settimana per la raccolta. Pianifica la tua uscita!
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-forest-700/40 border border-forest-600/40 rounded-2xl flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">🌿</span>
                    <p className="text-sm text-forest-200 leading-relaxed">
                      <strong>Oggi è il giorno migliore</strong> di questo periodo.
                      Non aspettare — il bosco ti aspetta!
                    </p>
                  </div>
                )}
              </section>

              {/* === SECTION 3: Species forecast === */}
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-playfair)] mb-1">
                    Previsione per Specie
                  </h2>
                  <p className="text-sm text-white/40">
                    Condizioni specifiche per le specie principali delle Alpi
                  </p>
                </div>

                <SpeciesForecast species={forecast.species} />
              </section>

              {/* === SECTION 4: Moon phase === */}
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-playfair)] mb-1">
                    Fase Lunare
                  </h2>
                  <p className="text-sm text-white/40">
                    La tradizione contadina lega la raccolta ai cicli della luna
                  </p>
                </div>

                <MoonWidget />
              </section>

              {/* === Disclaimer === */}
              <div className="p-4 bg-amber-900/20 border border-amber-700/30 rounded-2xl flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Il Fungo Score è basato su modelli statistici e condizioni meteo generali. Non garantisce la presenza di funghi.
                  I dati meteo sono forniti da{' '}
                  <a
                    href="https://open-meteo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-200"
                  >
                    Open-Meteo
                  </a>{' '}
                  (gratuito, open-source). La tradizione lunare è parte del folklore micologico, non scienza.
                  Consulta sempre un micologo esperto prima di consumare funghi.
                </p>
              </div>

            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
