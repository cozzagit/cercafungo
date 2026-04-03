'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

// ── Helpers ───────────────────────────────────────────────────

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|iphone|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const DISMISSED_KEY = 'cercafungo_install_dismissed';
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem(DISMISSED_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISSED_DURATION;
}

function markDismissed(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }
}

// ── Component ─────────────────────────────────────────────────

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed or recently dismissed
    if (isStandalone() || wasDismissedRecently()) return;

    const plat = detectPlatform();
    setPlatform(plat);

    // Android/Desktop: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show after a short delay (no native prompt available)
    if (plat === 'ios') {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setShowBanner(false);
    setShowIosGuide(false);
  }, []);

  if (!showBanner || isStandalone()) return null;

  // ── iOS guide modal ──────────────────────────────────────
  if (showIosGuide) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end justify-center">
        <div className="absolute inset-0 bg-bark-900/70 backdrop-blur-sm" onClick={() => setShowIosGuide(false)} />
        <div className="relative bg-cream-50 w-full max-w-lg rounded-t-3xl shadow-2xl safe-area-bottom">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-bark-200" />
          </div>

          <div className="px-6 pt-2 pb-8 space-y-5">
            <div className="text-center">
              <span className="text-4xl">🍄</span>
              <h3 className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)] mt-2">
                Installa CercaFungo
              </h3>
              <p className="text-sm text-bark-500 mt-1">
                Segui questi 3 passaggi per avere l'app sulla tua schermata Home
              </p>
            </div>

            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-forest-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-semibold text-bark-800 text-sm">
                  Tocca il pulsante <span className="inline-flex items-center">Condividi</span>
                </p>
                <p className="text-xs text-bark-500 mt-0.5">
                  In basso nella barra di Safari (quadrato con freccia verso l'alto)
                </p>
                <div className="mt-2 bg-white border border-bark-200 rounded-xl px-4 py-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-forest-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-semibold text-bark-800 text-sm">
                  Scorri e tocca "Aggiungi a Home"
                </p>
                <p className="text-xs text-bark-500 mt-0.5">
                  Potrebbe servire scorrere il menu verso il basso
                </p>
                <div className="mt-2 bg-white border border-bark-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <svg className="w-5 h-5 text-bark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-sm text-bark-700">Aggiungi alla schermata Home</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-forest-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-semibold text-bark-800 text-sm">
                  Conferma toccando "Aggiungi"
                </p>
                <p className="text-xs text-bark-500 mt-0.5">
                  CercaFungo apparira come app sulla tua Home
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setShowIosGuide(false)}
                className="flex-1 py-3 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Ho capito!
              </button>
              <button
                onClick={handleDismiss}
                className="py-3 px-4 text-bark-500 hover:text-bark-700 font-medium text-sm transition-colors"
              >
                Non ora
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Install banner ───────────────────────────────────────
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-fade-in-up" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}>
      <div className="bg-white border border-cream-400 rounded-2xl shadow-2xl p-4 max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-forest-600 rounded-xl flex items-center justify-center text-2xl">
            🍄
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-bark-800 text-sm">Installa CercaFungo</h4>
            <p className="text-xs text-bark-500 mt-0.5 leading-relaxed">
              {platform === 'ios'
                ? 'Aggiungi alla Home per accesso rapido — funziona anche offline!'
                : 'Installa l\'app per accesso rapido, notifiche e uso offline!'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-bark-400 hover:text-bark-600 hover:bg-bark-100 transition-colors"
            aria-label="Chiudi"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          {platform === 'ios' ? (
            <button
              onClick={() => setShowIosGuide(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Come installare
            </button>
          ) : (
            <button
              onClick={handleInstall}
              disabled={installing || !deferredPrompt}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-forest-600 hover:bg-forest-700 disabled:bg-forest-400 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {installing ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Installa App
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="py-2.5 px-4 bg-cream-200 hover:bg-cream-300 text-bark-600 font-medium rounded-xl text-sm transition-colors"
          >
            Non ora
          </button>
        </div>
      </div>
    </div>
  );
}
