'use client';

/**
 * Sessione Attiva — CercaFungo
 *
 * Real-time GPS tracking, live timer, quick-add findings, trail canvas map.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  getActiveSession,
  endSession,
  addFindingToSession,
  startGpsTracking,
  stopGpsTracking,
  formatDistance,
  type ForagingSession,
  type SessionFinding,
} from '@/lib/diary-store';

// ── Trail canvas map ──────────────────────────────────────────────────────────

interface TrailMapProps {
  trackPoints: { lat: number; lng: number }[];
  currentLat?: number;
  currentLng?: number;
}

function TrailMap({ trackPoints, currentLat, currentLng }: TrailMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const allPoints = [...trackPoints];
    if (currentLat !== undefined && currentLng !== undefined) {
      allPoints.push({ lat: currentLat, lng: currentLng });
    }

    if (allPoints.length === 0) {
      // No GPS yet — draw placeholder
      ctx.fillStyle = 'rgba(74, 124, 46, 0.06)';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(74, 124, 46, 0.15)';
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(8, 8, W - 16, H - 16);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(74, 124, 46, 0.4)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('In attesa GPS...', W / 2, H / 2 - 8);
      ctx.font = '11px system-ui';
      ctx.fillStyle = 'rgba(74, 124, 46, 0.3)';
      ctx.fillText('Il percorso apparirà qui', W / 2, H / 2 + 12);
      return;
    }

    // Compute bounding box with padding
    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const pad = 24;
    const rangeLatRaw = maxLat - minLat || 0.001;
    const rangeLngRaw = maxLng - minLng || 0.001;

    // Keep aspect ratio
    const scaleX = (W - pad * 2) / rangeLngRaw;
    const scaleY = (H - pad * 2) / rangeLatRaw;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = pad + ((W - pad * 2) - rangeLngRaw * scale) / 2;
    const offsetY = pad + ((H - pad * 2) - rangeLatRaw * scale) / 2;

    const toX = (lng: number) => offsetX + (lng - minLng) * scale;
    const toY = (lat: number) => offsetY + (maxLat - lat) * scale; // flip Y

    // Background
    ctx.fillStyle = 'rgba(240, 245, 236, 0.5)';
    ctx.fillRect(0, 0, W, H);

    // Trail path
    if (trackPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(toX(trackPoints[0].lng), toY(trackPoints[0].lat));
      for (let i = 1; i < trackPoints.length; i++) {
        ctx.lineTo(toX(trackPoints[i].lng), toY(trackPoints[i].lat));
      }
      ctx.strokeStyle = '#4a7c2e';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Start dot (amber)
    if (trackPoints.length > 0) {
      const sp = trackPoints[0];
      ctx.beginPath();
      ctx.arc(toX(sp.lng), toY(sp.lat), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#c68b3e';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Current position pulsing (green)
    if (currentLat !== undefined && currentLng !== undefined) {
      const cx = toX(currentLng);
      const cy = toY(currentLat);

      // Outer pulse ring
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 124, 46, 0.2)';
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4a7c2e';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [trackPoints, currentLat, currentLng]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={220}
      className="w-full rounded-xl border border-cream-400/50"
      style={{ maxHeight: 220 }}
    />
  );
}

// ── Quick-add finding modal ───────────────────────────────────────────────────

interface AddFindingFormProps {
  onSubmit: (finding: Omit<SessionFinding, 'id'>) => void;
  onClose: () => void;
  lat: number | null;
  lng: number | null;
}

function AddFindingModal({ onSubmit, onClose, lat, lng }: AddFindingFormProps) {
  const [speciesName, setSpeciesName] = useState('');
  const [confidence, setConfidence] = useState(80);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!speciesName.trim()) {
      setError('Inserisci il nome della specie');
      return;
    }

    onSubmit({
      speciesId: speciesName.toLowerCase().replace(/\s+/g, '-'),
      speciesName: speciesName.trim(),
      confidence,
      lat: lat ?? 0,
      lng: lng ?? 0,
      timestamp: new Date().toISOString(),
      notes: notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-bark-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-cream-50 rounded-2xl border border-cream-400 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cream-400/50">
          <h3 className="font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
            Aggiungi Ritrovamento
          </h3>
          <button onClick={onClose} className="p-1.5 text-bark-400 hover:text-bark-700 transition-colors rounded-lg hover:bg-cream-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Species name */}
          <div>
            <label className="block text-sm font-medium text-bark-700 mb-1.5">
              Specie *
            </label>
            <input
              type="text"
              value={speciesName}
              onChange={(e) => { setSpeciesName(e.target.value); setError(''); }}
              placeholder="es. Porcino, Gallinaccio, ..."
              className="w-full px-4 py-2.5 border border-cream-400 rounded-xl bg-cream-100 text-bark-800 placeholder:text-bark-300 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
              autoFocus
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          </div>

          {/* Confidence slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-bark-700">Certezza identificazione</label>
              <span className="text-sm font-bold text-forest-600">{confidence}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-forest-600"
            />
            <div className="flex justify-between text-xs text-bark-400 mt-1">
              <span>Incerto</span>
              <span>Sicuro</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-bark-700 mb-1.5">
              Note (opzionale)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quanti esemplari, dimensioni, habitat..."
              rows={2}
              className="w-full px-4 py-2.5 border border-cream-400 rounded-xl bg-cream-100 text-bark-800 placeholder:text-bark-300 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm resize-none"
            />
          </div>

          {/* GPS coords hint */}
          {lat !== null && (
            <p className="text-xs text-bark-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
              Posizione GPS rilevata ({lat.toFixed(5)}, {lng?.toFixed(5)})
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-cream-400 text-bark-600 rounded-xl font-medium text-sm hover:bg-cream-200 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md"
            >
              Aggiungi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SessionePage() {
  const router = useRouter();

  const [session, setSession] = useState<ForagingSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [addedCount, setAddedCount] = useState(0); // for toast feedback

  const sessionIdRef = useRef<string | null>(null);

  // Load active session
  const refreshSession = useCallback(() => {
    const active = getActiveSession();
    setSession(active);
    if (active) sessionIdRef.current = active.id;
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Start GPS on mount
  useEffect(() => {
    const active = getActiveSession();
    if (!active) return;

    startGpsTracking(active.id, (lat, lng) => {
      setCurrentLat(lat);
      setCurrentLng(lng);
      // Refresh session stats from store
      setSession(getActiveSession());
    });

    return () => {
      stopGpsTracking();
    };
  }, [isLoaded]);

  // Timer tick
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.startedAt]);

  // Refresh session from store periodically to get track updates
  useEffect(() => {
    const id = setInterval(() => {
      setSession(getActiveSession());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  function handleAddFinding(finding: Omit<SessionFinding, 'id'>) {
    if (!sessionIdRef.current) return;
    addFindingToSession(sessionIdRef.current, finding);
    setShowAddFinding(false);
    setAddedCount((n) => n + 1);
    setSession(getActiveSession());
  }

  function handleEndSession() {
    if (!sessionIdRef.current || isEnding) return;
    setIsEnding(true);
    stopGpsTracking();
    const ended = endSession(sessionIdRef.current);
    if (ended) {
      router.push(`/diario/${ended.id}`);
    } else {
      router.push('/diario');
    }
  }

  // Format timer
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timerStr = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <span className="text-4xl animate-bounce">🍄</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream-200 gap-4 p-4">
        <div className="text-5xl">🌲</div>
        <h2 className="text-xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
          Nessuna uscita attiva
        </h2>
        <p className="text-bark-400 text-sm text-center">
          Non c'è nessuna sessione in corso. Avviane una dal Diario.
        </p>
        <Link
          href="/diario"
          className="px-6 py-3 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Vai al Diario
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-cream-200">
        {/* Navbar */}
        <nav className="sticky top-0 z-40 bg-forest-900/95 backdrop-blur-md border-b border-forest-700/50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <Link href="/diario" className="flex items-center gap-2 text-forest-300 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Diario</span>
              </Link>

              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-sm text-forest-200 font-medium">Uscita in corso</span>
              </div>

              <button
                onClick={() => setShowEndConfirm(true)}
                className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors px-2 py-1"
              >
                Termina
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
          {/* Title */}
          <h1 className="text-xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-1">
            {session.title}
          </h1>
          <p className="text-xs text-bark-400 mb-6">
            Iniziata alle {new Date(session.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Timer — big mono */}
          <div className="flex flex-col items-center py-6 mb-6 bg-gradient-to-b from-forest-900 to-forest-800 rounded-2xl border border-forest-700/50 shadow-lg">
            <p className="text-xs text-forest-400 font-medium uppercase tracking-widest mb-2">Tempo trascorso</p>
            <p className="font-mono text-5xl font-bold text-white tabular-nums tracking-wider">
              {timerStr}
            </p>

            {/* Live stats row */}
            <div className="flex items-center gap-8 mt-5 pt-5 border-t border-forest-700/50 w-full px-8">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-forest-200">
                  {formatDistance(session.distanceMeters)}
                </p>
                <p className="text-xs text-forest-500 mt-0.5">percorso</p>
              </div>
              <div className="w-px h-8 bg-forest-700" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-forest-200">
                  {session.findings.length}
                </p>
                <p className="text-xs text-forest-500 mt-0.5">ritrovamenti</p>
              </div>
              <div className="w-px h-8 bg-forest-700" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-forest-200">
                  {session.speciesFound.length}
                </p>
                <p className="text-xs text-forest-500 mt-0.5">specie</p>
              </div>
            </div>
          </div>

          {/* Weather snapshot */}
          {session.weatherSnapshot && (
            <div className="mb-5 flex items-center gap-3 p-3.5 bg-cream-50 rounded-xl border border-cream-400/50 text-sm text-bark-600">
              <span className="text-lg">🌤</span>
              <span>{session.weatherSnapshot.temp}°C</span>
              <span>·</span>
              <span>Umidità {session.weatherSnapshot.humidity}%</span>
              <span>·</span>
              <span className="capitalize">{session.weatherSnapshot.conditions}</span>
            </div>
          )}

          {/* Trail map */}
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
              Percorso GPS
            </h2>
            <TrailMap
              trackPoints={session.trackPoints}
              currentLat={currentLat ?? undefined}
              currentLng={currentLng ?? undefined}
            />
            {currentLat === null && (
              <p className="text-xs text-bark-400 mt-1.5 text-center">
                Abilita il GPS per registrare il percorso
              </p>
            )}
          </div>

          {/* Add finding CTA */}
          <button
            onClick={() => setShowAddFinding(true)}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Aggiungi Ritrovamento
          </button>

          {/* Findings list */}
          {session.findings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
                Ritrovamenti di oggi
              </h2>
              <div className="flex flex-col gap-2">
                {[...session.findings].reverse().map((f) => (
                  <div key={f.id} className="flex items-start gap-3 p-3.5 bg-cream-50 rounded-xl border border-cream-400/50">
                    <span className="text-xl mt-0.5">🍄</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-bark-800 text-sm">{f.speciesName}</span>
                        <span className="text-xs px-2 py-0.5 bg-forest-100 text-forest-700 rounded-full font-medium">
                          {f.confidence}% certezza
                        </span>
                      </div>
                      {f.notes && (
                        <p className="text-xs text-bark-400 mt-0.5 line-clamp-2">{f.notes}</p>
                      )}
                      <p className="text-xs text-bark-300 mt-0.5">
                        {new Date(f.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add finding modal */}
      {showAddFinding && (
        <AddFindingModal
          onSubmit={handleAddFinding}
          onClose={() => setShowAddFinding(false)}
          lat={currentLat}
          lng={currentLng}
        />
      )}

      {/* End session confirm */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-cream-50 rounded-2xl border border-cream-400 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-2">
              Terminare l'uscita?
            </h3>
            <p className="text-bark-500 text-sm mb-1">
              Durata: <strong>{timerStr}</strong>
            </p>
            <p className="text-bark-500 text-sm mb-1">
              Percorso: <strong>{formatDistance(session.distanceMeters)}</strong>
            </p>
            <p className="text-bark-500 text-sm mb-5">
              Ritrovamenti: <strong>{session.findings.length}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 border border-cream-400 text-bark-600 rounded-xl font-medium text-sm hover:bg-cream-200 transition-colors"
              >
                Continua
              </button>
              <button
                onClick={handleEndSession}
                disabled={isEnding}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {isEnding ? 'Salvando...' : 'Termina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
