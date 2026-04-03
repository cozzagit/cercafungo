'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  getSpeciesById,
  getSpeciesSlug,
  EDIBILITY_LABELS,
  splitDifferences,
  type Species,
} from '@/lib/species-data';

// ── Types ───────────────────────────────────────────────────

interface LookalikeComparisonProps {
  /** The detected / currently-viewed species. */
  detectedSpecies: Species;
  /** Confidence value 0-1 from the model, if coming from the scanner. */
  confidence?: number;
  /** Called when the user taps "Non sono sicuro". */
  onUnsure?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Decide whether to show the lookalike panel based on safety rules.
 * Always shows for toxic/deadly species.
 * Shows when confidence is low, or when high-danger lookalikes exist.
 */
export function shouldShowLookalikes(
  species: Species,
  confidence?: number
): boolean {
  // Rule 1 — always show for dangerous species
  if (species.edibility === 'tossico' || species.edibility === 'mortale') {
    return true;
  }

  // No lookalikes defined — nothing to show
  if (species.confusableWith.length === 0) return false;

  // Rule 2 — always show when high-danger lookalikes exist
  const hasHighDanger = species.confusableWith.some(
    (c) => c.dangerLevel === 'alto' || c.dangerLevel === 'mortale'
  );
  if (hasHighDanger) return true;

  // Rule 3 — low confidence on an edible species
  if (confidence !== undefined && confidence < 0.85) return true;

  return false;
}

function EdibilityBadge({ edibility }: { edibility: Species['edibility'] }) {
  const styles: Record<Species['edibility'], string> = {
    ottimo: 'bg-green-600 text-white',
    buono: 'bg-green-500 text-white',
    commestibile: 'bg-amber-500 text-white',
    non_commestibile: 'bg-gray-400 text-white',
    tossico: 'bg-orange-600 text-white',
    mortale:
      'bg-red-700 text-white animate-[dangerPulse_2s_ease-in-out_infinite]',
  };

  const label = EDIBILITY_LABELS[edibility];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${styles[edibility]}`}
    >
      {edibility === 'mortale' && <span className="mr-1">☠</span>}
      {edibility === 'tossico' && <span className="mr-1">⚠</span>}
      {(edibility === 'ottimo' || edibility === 'buono' || edibility === 'commestibile') && (
        <span className="mr-1">✓</span>
      )}
      {label}
    </span>
  );
}

function DangerLevelBadge({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; label: string }> = {
    mortale: { bg: 'bg-red-700 text-white animate-[dangerPulse_2s_ease-in-out_infinite]', label: '☠ MORTALE' },
    alto: { bg: 'bg-orange-600 text-white', label: '⚠ Pericolo ALTO' },
    medio: { bg: 'bg-yellow-500 text-white', label: '~ Pericolo MEDIO' },
    basso: { bg: 'bg-blue-500 text-white', label: '↓ Pericolo basso' },
  };
  const c = cfg[level] ?? cfg.basso;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${c.bg}`}>
      {c.label}
    </span>
  );
}

// ── Sub-component: single comparison pair ───────────────────

interface ComparisonPairProps {
  detected: Species;
  lookalike: Species;
  dangerLevel: string;
  differences: string;
}

function ComparisonPair({ detected, lookalike, dangerLevel, differences }: ComparisonPairProps) {
  const isMortale = dangerLevel === 'mortale';
  const isAlto = dangerLevel === 'alto';
  const isHighDanger = isMortale || isAlto;

  // Border colors
  const detectedBorderClass =
    detected.edibility === 'tossico' || detected.edibility === 'mortale'
      ? 'border-red-400'
      : detected.edibility === 'commestibile' || detected.edibility === 'non_commestibile'
      ? 'border-amber-400'
      : 'border-green-400';

  const lookalikeSlug = getSpeciesSlug(lookalike);

  return (
    <div className="mb-6">
      {/* Pair heading — danger level prominent */}
      <div className="flex items-center gap-2 mb-3">
        <DangerLevelBadge level={dangerLevel} />
        {isMortale && (
          <span className="text-xs text-red-700 font-semibold animate-pulse">
            Confusione fatale documentata
          </span>
        )}
      </div>

      {/* Side-by-side cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* LEFT — detected species */}
        <div
          className={`
            rounded-xl border-2 p-3 bg-white
            ${detectedBorderClass}
          `}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
            Specie rilevata
          </div>
          <div className="font-bold text-bark-800 text-sm leading-snug mb-1">
            {detected.italianName}
          </div>
          <div className="text-xs text-bark-400 italic mb-2">
            {detected.scientificName}
          </div>
          <EdibilityBadge edibility={detected.edibility} />
        </div>

        {/* RIGHT — dangerous lookalike */}
        <div
          className={`
            rounded-xl border-2 p-3 relative overflow-hidden
            ${isMortale
              ? 'bg-red-50 border-red-500'
              : isAlto
              ? 'bg-orange-50 border-orange-500'
              : 'bg-amber-50 border-amber-400'
            }
          `}
        >
          {/* MORTALE ribbon */}
          {isMortale && (
            <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg tracking-widest uppercase">
              MORTALE
            </div>
          )}

          <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1.5">
            Sosia pericoloso
          </div>
          <div
            className={`font-bold text-sm leading-snug mb-1 ${
              isMortale ? 'text-red-800' : isAlto ? 'text-orange-800' : 'text-amber-800'
            }`}
          >
            {lookalike.italianName}
          </div>
          <div className={`text-xs italic mb-2 ${isMortale ? 'text-red-500' : 'text-orange-500'}`}>
            {lookalike.scientificName}
          </div>
          <EdibilityBadge edibility={lookalike.edibility} />
        </div>
      </div>

      {/* Differences list */}
      <div
        className={`
          mt-3 rounded-xl p-3 border
          ${isHighDanger
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
          }
        `}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <svg
            className={`w-4 h-4 flex-shrink-0 ${isHighDanger ? 'text-red-600' : 'text-amber-600'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span
            className={`text-xs font-bold uppercase tracking-wide ${
              isHighDanger ? 'text-red-700' : 'text-amber-700'
            }`}
          >
            Come distinguerli
          </span>
        </div>

        {/* Split differences text into bullet points for readability */}
        <ul className={`space-y-1 ${isHighDanger ? 'text-red-800' : 'text-amber-800'}`}>
          {splitDifferences(differences).map((point, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed">
              <span className="mt-0.5 flex-shrink-0 font-bold">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Link to lookalike detail page */}
      <div className="mt-2 text-right">
        <Link
          href={`/guida/${lookalikeSlug}`}
          className={`text-xs font-medium transition-colors underline underline-offset-2 ${
            isHighDanger
              ? 'text-red-600 hover:text-red-800'
              : 'text-amber-600 hover:text-amber-800'
          }`}
        >
          Scheda completa {lookalike.italianName} →
        </Link>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function LookalikeComparison({
  detectedSpecies,
  confidence,
  onUnsure,
}: LookalikeComparisonProps) {
  const [expanded, setExpanded] = useState(true);

  if (!shouldShowLookalikes(detectedSpecies, confidence)) return null;

  const hasMortale = detectedSpecies.confusableWith.some(
    (c) => c.dangerLevel === 'mortale'
  );

  const lookalikeData = detectedSpecies.confusableWith
    .map((c) => ({
      ...c,
      species: getSpeciesById(c.speciesId),
    }))
    .filter((c): c is typeof c & { species: Species } => c.species !== undefined)
    // Sort by danger level: mortale > alto > medio > basso
    .sort((a, b) => {
      const order = { mortale: 0, alto: 1, medio: 2, basso: 3 };
      return (order[a.dangerLevel as keyof typeof order] ?? 3) -
             (order[b.dangerLevel as keyof typeof order] ?? 3);
    });

  if (lookalikeData.length === 0) return null;

  return (
    <div
      className={`
        rounded-2xl border-2 overflow-hidden
        ${hasMortale
          ? 'border-red-400 bg-white'
          : 'border-orange-300 bg-white'
        }
      `}
    >
      {/* Header — collapsible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 text-left
          ${hasMortale
            ? 'bg-red-600 text-white'
            : 'bg-orange-500 text-white'
          }
        `}
      >
        <span className="text-xl flex-shrink-0">
          {hasMortale ? '☠️' : '⚠️'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm uppercase tracking-wide">
            Confronto Sosia Pericolosi
          </div>
          <div className="text-xs opacity-85 mt-0.5">
            {lookalikeData.length === 1
              ? '1 specie pericolosamente simile trovata'
              : `${lookalikeData.length} specie pericolosamente simili trovate`}
          </div>
        </div>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Top warning banner */}
      {expanded && (
        <div
          className={`px-4 py-3 text-sm font-semibold flex items-start gap-2 ${
            hasMortale
              ? 'bg-red-50 border-b border-red-200 text-red-800'
              : 'bg-orange-50 border-b border-orange-200 text-orange-800'
          }`}
        >
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>
            ATTENZIONE &mdash; Verifica sempre con un esperto prima di raccogliere o consumare.
          </span>
        </div>
      )}

      {/* Comparison pairs */}
      {expanded && (
        <div className="px-4 pt-4 pb-2">
          {lookalikeData.map((item) => (
            <ComparisonPair
              key={item.speciesId}
              detected={detectedSpecies}
              lookalike={item.species}
              dangerLevel={item.dangerLevel}
              differences={item.differences}
            />
          ))}
        </div>
      )}

      {/* Full safety disclaimer */}
      {expanded && (
        <div className="mx-4 mb-4 rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 leading-relaxed space-y-2">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            AVVERTENZA SICUREZZA
          </p>
          <p>
            Questo confronto ha scopo puramente indicativo. <strong>NON consumare funghi</strong>{' '}
            basandosi esclusivamente su questa app. Consulta <strong>SEMPRE</strong> un micologo
            esperto o il servizio ASL della tua zona prima del consumo. In caso di dubbio,{' '}
            <strong>NON raccogliere il fungo.</strong>
          </p>
          <p className="text-gray-500">
            Centri micologici ASL: cerca &ldquo;ispettorato micologico&rdquo; + la tua provincia.
          </p>
        </div>
      )}

      {/* CTA footer */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {onUnsure && (
            <button
              onClick={onUnsure}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Non sono sicuro — Consulta un esperto
            </button>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <span>Consulta un esperto — ispettorato micologico ASL</span>
          </div>
        </div>
      )}
    </div>
  );
}
