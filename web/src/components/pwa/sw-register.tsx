'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        setRegistration(reg);

        // Check for updates periodically (every 60 min)
        setInterval(() => reg.update(), 60 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage('skipWaiting');
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-fade-in-up">
      <div className="bg-forest-700 border border-forest-500 rounded-2xl shadow-2xl p-4 max-w-lg mx-auto flex items-center gap-3">
        <div className="flex-shrink-0 text-2xl">🍄</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">Aggiornamento disponibile</p>
          <p className="text-xs text-forest-200 mt-0.5">Una nuova versione di CercaFungo è pronta</p>
        </div>
        <button
          onClick={handleUpdate}
          className="flex-shrink-0 px-4 py-2 bg-white hover:bg-cream-100 text-forest-700 font-bold rounded-xl text-xs transition-colors"
        >
          Aggiorna
        </button>
      </div>
    </div>
  );
}
