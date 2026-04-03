'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getActiveSession, formatDistance, formatDuration, type ForagingSession } from '@/lib/diary-store';

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
}

export function ActiveSessionBar() {
  const [session, setSession] = useState<ForagingSession | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds

  const refreshSession = useCallback(() => {
    const active = getActiveSession();
    setSession(active);
  }, []);

  // Poll for active session on mount and periodically
  useEffect(() => {
    refreshSession();
    const interval = setInterval(refreshSession, 10000); // every 10s
    return () => clearInterval(interval);
  }, [refreshSession]);

  // Live timer tick
  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const diffSec = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000
      );
      setElapsed(diffSec);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const timerStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Link href="/diario/sessione" className="block">
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-forest-800/95 backdrop-blur-md border-t border-forest-600/50 shadow-2xl safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left: status + title */}
          <div className="flex items-center gap-3 min-w-0">
            <PulsingDot />
            <div className="min-w-0">
              <p className="text-xs text-forest-300 font-medium truncate">Uscita in corso</p>
              <p className="text-sm text-white font-semibold truncate leading-tight">
                {session.title}
              </p>
            </div>
          </div>

          {/* Center: stats */}
          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <div className="text-center">
              <p className="font-mono text-lg font-bold text-white tabular-nums">{timerStr}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-forest-200">
                {formatDistance(session.distanceMeters)}
              </p>
              <p className="text-xs text-forest-400">percorso</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-forest-200">
                {session.findings.length}
              </p>
              <p className="text-xs text-forest-400">trovati</p>
            </div>
          </div>

          {/* Mobile timer */}
          <div className="sm:hidden shrink-0 text-right">
            <p className="font-mono text-base font-bold text-white tabular-nums">{timerStr}</p>
            <p className="text-xs text-forest-400">
              {session.findings.length} trovati · {formatDistance(session.distanceMeters)}
            </p>
          </div>

          {/* Right: CTA arrow */}
          <div className="shrink-0 flex items-center gap-1.5 bg-forest-600 hover:bg-forest-500 transition-colors px-3 py-2 rounded-xl">
            <span className="text-xs text-forest-100 font-semibold hidden sm:block">Vai all'uscita</span>
            <svg className="w-4 h-4 text-forest-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
