'use client';

/**
 * Dettaglio Sessione — CercaFungo
 *
 * Full session review: trail map, findings, editable rating + notes, share, delete.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  getSessionById,
  updateSession,
  deleteSession,
  removeFinding,
  formatDistance,
  formatDuration,
  getSeasonLabel,
  type ForagingSession,
} from '@/lib/diary-store';

// ── Trail map (reuse same canvas approach) ───────────────────────────────────

interface TrailMapDetailProps {
  session: ForagingSession;
}

function TrailMapDetail({ session }: TrailMapDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const trackPoints = session.trackPoints;
    const findings = session.findings;

    // Collect all points for bounding box
    const allPts = [
      ...trackPoints,
      ...findings.map((f) => ({ lat: f.lat, lng: f.lng })),
    ];

    if (allPts.length === 0) {
      ctx.fillStyle = 'rgba(240, 245, 236, 0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(74, 124, 46, 0.35)';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Nessun dato GPS disponibile', W / 2, H / 2);
      return;
    }

    const lats = allPts.map((p) => p.lat);
    const lngs = allPts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const pad = 28;
    const rangeLatRaw = maxLat - minLat || 0.001;
    const rangeLngRaw = maxLng - minLng || 0.001;

    const scaleX = (W - pad * 2) / rangeLngRaw;
    const scaleY = (H - pad * 2) / rangeLatRaw;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = pad + ((W - pad * 2) - rangeLngRaw * scale) / 2;
    const offsetY = pad + ((H - pad * 2) - rangeLatRaw * scale) / 2;

    const toX = (lng: number) => offsetX + (lng - minLng) * scale;
    const toY = (lat: number) => offsetY + (maxLat - lat) * scale;

    // Background
    ctx.fillStyle = 'rgba(240, 245, 236, 0.6)';
    ctx.fillRect(0, 0, W, H);

    // Trail
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

    // Start marker (amber)
    if (trackPoints.length > 0) {
      const sp = trackPoints[0];
      ctx.beginPath();
      ctx.arc(toX(sp.lng), toY(sp.lat), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#c68b3e';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // End marker (forest green square)
    if (trackPoints.length > 1) {
      const ep = trackPoints[trackPoints.length - 1];
      const ex = toX(ep.lng);
      const ey = toY(ep.lat);
      ctx.fillStyle = '#2d5016';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(ex - 5, ey - 5, 10, 10);
      ctx.fill();
      ctx.stroke();
    }

    // Findings (mushroom dots)
    for (const f of findings) {
      const fx = toX(f.lng);
      const fy = toY(f.lat);

      if (fx === 0 && fy === 0) continue; // skip zero coords (no GPS)

      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#c68b3e';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // tiny mushroom emoji alternative — text
      ctx.fillStyle = 'white';
      ctx.font = '8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🍄', fx, fy + 3);
    }
  }, [session]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={260}
      className="w-full rounded-xl border border-cream-400/50"
      style={{ maxHeight: 260 }}
    />
  );
}

// ── Star rating (interactive) ─────────────────────────────────────────────────

function StarRatingInput({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const filled = starValue <= (hovered || rating);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue === rating ? 0 : starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`${starValue} stelle`}
          >
            <svg
              className={`w-7 h-7 transition-colors ${filled ? 'text-amber-500' : 'text-cream-400'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-1 text-sm text-amber-600 font-medium">
          {['', 'Scarsa', 'Sufficiente', 'Buona', 'Ottima', 'Perfetta'][rating]}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SessioneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [session, setSession] = useState<ForagingSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingFinding, setDeletingFinding] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState('');

  const loadSession = useCallback(() => {
    const s = getSessionById(id);
    setSession(s);
    if (s) {
      setNotes(s.notes);
      setRating(s.rating);
    }
    setIsLoaded(true);
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function handleSave() {
    if (!session) return;
    setIsSaving(true);
    const updated = updateSession(session.id, { notes, rating });
    if (updated) setSession(updated);
    setTimeout(() => setIsSaving(false), 800);
  }

  function handleDeleteFinding(findingId: string) {
    if (!session) return;
    setDeletingFinding(findingId);
    const ok = removeFinding(session.id, findingId);
    if (ok) {
      const updated = getSessionById(session.id);
      if (updated) setSession(updated);
    }
    setDeletingFinding(null);
  }

  function handleDeleteSession() {
    if (!session) return;
    deleteSession(session.id);
    router.push('/diario');
  }

  async function handleShare() {
    if (!session) return;
    const text = [
      `🍄 Uscita nel bosco — ${new Date(session.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      `⏱ Durata: ${formatDuration(session.durationMinutes)}`,
      `🗺 Percorso: ${formatDistance(session.distanceMeters)}`,
      `🍄 Ritrovamenti: ${session.findings.length}`,
      session.speciesFound.length > 0 ? `Specie: ${session.speciesFound.join(', ')}` : '',
      '\nRegistrato con CercaFungo — cercafungo.vibecanyon.com',
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: session.title, text });
      } catch {
        // Share was cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShareMsg('Copiato negli appunti!');
      setTimeout(() => setShareMsg(''), 2500);
    }
  }

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
          Uscita non trovata
        </h2>
        <Link href="/diario" className="px-6 py-3 bg-forest-600 text-white rounded-xl font-semibold text-sm hover:bg-forest-700 transition-colors">
          Torna al Diario
        </Link>
      </div>
    );
  }

  const startDate = new Date(session.startedAt);
  const dateStr = startDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const capitalDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="min-h-screen bg-cream-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream-50/90 backdrop-blur-md border-b border-cream-400">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/diario" className="flex items-center gap-2 text-bark-500 hover:text-bark-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Diario</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13" />
                </svg>
                {shareMsg || 'Condividi'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-bark-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                aria-label="Elimina uscita"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-bark-400 font-medium">{getSeasonLabel(session.startedAt)}</span>
          </div>
          <h1 className="text-2xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-1">
            {session.title}
          </h1>
          <p className="text-sm text-bark-500">{capitalDate}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Durata',
              value: formatDuration(session.durationMinutes),
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                </svg>
              ),
            },
            {
              label: 'Percorso',
              value: formatDistance(session.distanceMeters),
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <circle cx="12" cy="11" r="3" />
                </svg>
              ),
            },
            {
              label: 'Ritrovamenti',
              value: String(session.findings.length),
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C7.029 3 3 7.029 3 12h18c0-4.971-4.029-9-9-9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12v5a4 4 0 008 0v-5" />
                </svg>
              ),
            },
            {
              label: 'Specie',
              value: String(session.speciesFound.length),
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 003 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-.601-.062-1.187-.18-1.754" />
                </svg>
              ),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-gradient-to-b from-cream-50 to-cream-100/50 rounded-xl border border-cream-400/50 shadow-sm p-3.5 flex flex-col items-center gap-1.5">
              <div className="text-forest-600">{stat.icon}</div>
              <p className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
                {stat.value}
              </p>
              <p className="text-xs text-bark-400 text-center">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Weather */}
        {session.weatherSnapshot && (
          <div className="mb-6 flex items-center gap-3 p-3.5 bg-cream-50 rounded-xl border border-cream-400/50 text-sm text-bark-600">
            <span className="text-lg">🌤</span>
            <span>{session.weatherSnapshot.temp}°C</span>
            <span>·</span>
            <span>Umidità {session.weatherSnapshot.humidity}%</span>
            <span>·</span>
            <span className="capitalize">{session.weatherSnapshot.conditions}</span>
          </div>
        )}

        {/* Trail map */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
            Percorso e ritrovamenti
          </h2>
          <TrailMapDetail session={session} />
          {session.trackPoints.length === 0 && (
            <p className="text-xs text-bark-400 mt-1.5 text-center">
              Nessun punto GPS registrato per questa uscita
            </p>
          )}
          {session.trackPoints.length > 0 && (
            <p className="text-xs text-bark-400 mt-1.5 text-center">
              {session.trackPoints.length} punti GPS · 🟠 partenza · ■ arrivo · 🍄 ritrovamenti
            </p>
          )}
        </div>

        {/* Findings list */}
        {session.findings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
              Ritrovamenti ({session.findings.length})
            </h2>
            <div className="flex flex-col gap-2">
              {session.findings.map((f) => (
                <div key={f.id} className="flex items-start gap-3 p-4 bg-cream-50 rounded-xl border border-cream-400/50 group">
                  <span className="text-xl mt-0.5">🍄</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-bark-800 text-sm">{f.speciesName}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-forest-100 text-forest-700 rounded-full font-medium">
                          {f.confidence}%
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteFinding(f.id)}
                        disabled={deletingFinding === f.id}
                        className="shrink-0 p-1 text-bark-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                        aria-label="Rimuovi ritrovamento"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {f.notes && (
                      <p className="text-xs text-bark-500 mt-1">{f.notes}</p>
                    )}
                    <p className="text-xs text-bark-300 mt-0.5">
                      {new Date(f.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      {f.lat !== 0 && ` · ${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="mb-6 p-5 bg-cream-50 rounded-2xl border border-cream-400/50">
          <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
            Valuta l'uscita
          </h2>
          <StarRatingInput rating={rating} onChange={setRating} />
        </div>

        {/* Notes */}
        <div className="mb-6 p-5 bg-cream-50 rounded-2xl border border-cream-400/50">
          <h2 className="text-sm font-semibold text-bark-500 uppercase tracking-wider mb-3">
            Note personali
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi note sull'uscita: condizioni del bosco, zone esplorate, osservazioni..."
            rows={4}
            className="w-full px-4 py-3 border border-cream-400 rounded-xl bg-cream-100 text-bark-800 placeholder:text-bark-300 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md mb-4"
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvato!
            </span>
          ) : 'Salva modifiche'}
        </button>
      </main>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-cream-50 rounded-2xl border border-cream-400 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-2">
              Eliminare l'uscita?
            </h3>
            <p className="text-bark-500 text-sm mb-5">
              Questa azione è irreversibile. Tutti i dati di questa uscita, inclusi i ritrovamenti e il percorso GPS, saranno eliminati definitivamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 border border-cream-400 text-bark-600 rounded-xl font-medium text-sm hover:bg-cream-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteSession}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
