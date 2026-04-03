'use client';

import { useState } from 'react';

interface SafetyBannerProps {
  /** If true the banner cannot be dismissed (re-shows on each detection). */
  persistent?: boolean;
  variant?: 'red' | 'amber';
  className?: string;
}

export function SafetyBanner({
  persistent = false,
  variant = 'amber',
  className = '',
}: SafetyBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !persistent) return null;

  const isRed = variant === 'red';

  return (
    <div
      role="alert"
      className={`
        relative rounded-xl border px-4 py-3 flex items-start gap-3
        ${isRed
          ? 'bg-red-50 border-red-300 text-red-900'
          : 'bg-amber-50 border-amber-300 text-amber-900'
        }
        ${className}
      `}
    >
      {/* Left accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
          isRed ? 'bg-red-500' : 'bg-amber-500'
        }`}
      />

      {/* Warning icon */}
      <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
        {isRed ? '☠️' : '⚠️'}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold mb-0.5 ${isRed ? 'text-red-800' : 'text-amber-800'}`}>
          Non consumare MAI funghi basandoti solo su questa app
        </p>
        <p className={`text-xs leading-relaxed ${isRed ? 'text-red-700' : 'text-amber-700'}`}>
          Consulta sempre un <strong>micologo esperto</strong> o il servizio{' '}
          <strong>ispettorato micologico ASL</strong> della tua zona prima del consumo.
          In caso di dubbio, NON raccogliere il fungo.
        </p>
        <p className={`text-xs mt-1 font-medium ${isRed ? 'text-red-600' : 'text-amber-600'}`}>
          Cerca &ldquo;ispettorato micologico&rdquo; + la tua provincia su Google Maps.
        </p>
      </div>

      {/* Dismiss button */}
      {!persistent && (
        <button
          onClick={() => setDismissed(true)}
          className={`
            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
            text-xs font-bold transition-colors mt-0.5
            ${isRed
              ? 'text-red-400 hover:bg-red-100 hover:text-red-700'
              : 'text-amber-400 hover:bg-amber-100 hover:text-amber-700'
            }
          `}
          aria-label="Chiudi avviso"
        >
          ✕
        </button>
      )}
    </div>
  );
}
