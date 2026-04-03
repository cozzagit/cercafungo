import Link from 'next/link';
import { getSpeciesById, getSpeciesSlug, EDIBILITY_LABELS, splitDifferences, type Species } from '@/lib/species-data';

interface LookalikeSectionProps {
  species: Species;
}

function EdibilityBadge({ edibility }: { edibility: Species['edibility'] }) {
  const styles: Record<Species['edibility'], string> = {
    ottimo: 'bg-green-600 text-white',
    buono: 'bg-green-500 text-white',
    commestibile: 'bg-amber-500 text-white',
    non_commestibile: 'bg-gray-400 text-white',
    tossico: 'bg-orange-600 text-white',
    mortale: 'edibility-mortale',
  };
  const label = EDIBILITY_LABELS[edibility];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${styles[edibility]}`}
    >
      {edibility === 'mortale' && '☠ '}
      {edibility === 'tossico' && '⚠ '}
      {(edibility === 'ottimo' || edibility === 'buono' || edibility === 'commestibile') && '✓ '}
      {label}
    </span>
  );
}

function DangerLevelPill({ level }: { level: string }) {
  const cfg: Record<string, { className: string; label: string }> = {
    mortale: { className: 'edibility-mortale', label: '☠ Pericolo MORTALE' },
    alto: { className: 'bg-orange-600 text-white', label: '⚠ Pericolo ALTO' },
    medio: { className: 'bg-yellow-500 text-white', label: '~ Pericolo MEDIO' },
    basso: { className: 'bg-blue-500 text-white', label: '↓ Pericolo BASSO' },
  };
  const c = cfg[level] ?? cfg.basso;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${c.className}`}>
      {c.label}
    </span>
  );
}

export function LookalikeSection({ species }: LookalikeSectionProps) {
  if (species.confusableWith.length === 0) return null;

  const lookalikeData = species.confusableWith
    .map((c) => ({ ...c, lookalike: getSpeciesById(c.speciesId) }))
    .filter((c): c is typeof c & { lookalike: Species } => c.lookalike !== undefined)
    .sort((a, b) => {
      const order = { mortale: 0, alto: 1, medio: 2, basso: 3 };
      return (order[a.dangerLevel as keyof typeof order] ?? 3) -
             (order[b.dangerLevel as keyof typeof order] ?? 3);
    });

  if (lookalikeData.length === 0) return null;

  const hasMortale = lookalikeData.some((c) => c.dangerLevel === 'mortale');

  return (
    <section className="mt-8" aria-labelledby="sosia-pericolosi-heading">
      {/* Section header */}
      <div
        className={`
          rounded-t-2xl px-5 py-4 flex items-center gap-3
          ${hasMortale ? 'bg-red-600' : 'bg-orange-500'}
          text-white
        `}
      >
        <span className="text-3xl flex-shrink-0" aria-hidden="true">
          {hasMortale ? '☠️' : '⚠️'}
        </span>
        <div>
          <h2
            id="sosia-pericolosi-heading"
            className="text-xl font-bold"
          >
            Sosia Pericolosi
          </h2>
          <p className="text-sm opacity-85 mt-0.5">
            {lookalikeData.length === 1
              ? '1 specie pericolosamente simile'
              : `${lookalikeData.length} specie pericolosamente simili`}
            {' '}— verifica sempre prima del consumo
          </p>
        </div>
      </div>

      {/* Top warning banner */}
      <div
        className={`
          px-5 py-3 text-sm font-semibold flex items-start gap-2
          ${hasMortale
            ? 'bg-red-50 border-x-2 border-red-400 text-red-800'
            : 'bg-orange-50 border-x-2 border-orange-400 text-orange-800'
          }
        `}
      >
        <span className="flex-shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
        <span>
          ATTENZIONE &mdash; Queste specie possono essere confuse con{' '}
          <strong>{species.italianName}</strong>.{' '}
          Consulta SEMPRE un esperto micologo o il centro ASL prima del consumo.
        </span>
      </div>

      {/* Comparison pairs */}
      <div
        className={`
          border-x-2 border-b-2 rounded-b-2xl overflow-hidden
          ${hasMortale ? 'border-red-400' : 'border-orange-400'}
          bg-white
        `}
      >
        <div className="p-5 space-y-6">
          {lookalikeData.map((item, idx) => {
            const isMortale = item.dangerLevel === 'mortale';
            const isAlto = item.dangerLevel === 'alto';
            const isHighDanger = isMortale || isAlto;
            const lookalikeSlug = getSpeciesSlug(item.lookalike);

            // Detected species card border
            const detectedBorderClass =
              species.edibility === 'tossico' || species.edibility === 'mortale'
                ? 'border-red-400'
                : species.edibility === 'commestibile' || species.edibility === 'non_commestibile'
                ? 'border-amber-400'
                : 'border-green-400';

            return (
              <div
                key={item.speciesId}
                className={idx > 0 ? 'pt-6 border-t border-gray-100' : ''}
              >
                {/* Danger level header */}
                <div className="flex items-center gap-2 mb-4">
                  <DangerLevelPill level={item.dangerLevel} />
                  {isMortale && (
                    <span className="text-sm text-red-700 font-semibold animate-pulse">
                      Confusione fatale documentata
                    </span>
                  )}
                </div>

                {/* Side-by-side cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* LEFT — this species */}
                  <div className={`rounded-xl border-2 p-4 bg-white ${detectedBorderClass}`}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Questa specie
                    </div>
                    <div className="font-bold text-bark-800 text-base leading-snug mb-1">
                      {species.italianName}
                    </div>
                    <div className="text-sm text-bark-400 italic mb-3">
                      {species.scientificName}
                    </div>
                    <EdibilityBadge edibility={species.edibility} />
                  </div>

                  {/* RIGHT — dangerous lookalike */}
                  <div
                    className={`
                      rounded-xl border-2 p-4 relative overflow-hidden
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

                    <div
                      className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
                        isMortale ? 'text-red-400' : isAlto ? 'text-orange-400' : 'text-amber-400'
                      }`}
                    >
                      Sosia pericoloso
                    </div>
                    <div
                      className={`font-bold text-base leading-snug mb-1 ${
                        isMortale ? 'text-red-800' : isAlto ? 'text-orange-800' : 'text-amber-800'
                      }`}
                    >
                      {item.lookalike.italianName}
                    </div>
                    <div
                      className={`text-sm italic mb-3 ${
                        isMortale ? 'text-red-500' : isAlto ? 'text-orange-500' : 'text-amber-500'
                      }`}
                    >
                      {item.lookalike.scientificName}
                    </div>
                    <EdibilityBadge edibility={item.lookalike.edibility} />
                  </div>
                </div>

                {/* Differences */}
                <div
                  className={`
                    mt-4 rounded-xl p-4 border
                    ${isHighDanger
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                    }
                  `}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${
                      isHighDanger ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
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
                    Come distinguerli
                  </p>
                  <ul className={`space-y-1.5 ${isHighDanger ? 'text-red-800' : 'text-amber-800'}`}>
                    {splitDifferences(item.differences).map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                        <span className="mt-1 flex-shrink-0 font-bold text-xs">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Link to lookalike page */}
                <div className="mt-3 text-right">
                  <Link
                    href={`/guida/${lookalikeSlug}`}
                    className={`text-sm font-medium underline underline-offset-2 transition-colors ${
                      isHighDanger
                        ? 'text-red-600 hover:text-red-800'
                        : 'text-amber-600 hover:text-amber-800'
                    }`}
                  >
                    Scheda completa {item.lookalike.italianName} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety disclaimer footer */}
        <div className="mx-5 mb-5 rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 leading-relaxed space-y-2">
          <p className="font-bold text-gray-800 flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            AVVERTENZA SICUREZZA
          </p>
          <p>
            Questo confronto ha scopo puramente indicativo.{' '}
            <strong>NON consumare funghi</strong> basandosi esclusivamente su questa app.
            Consulta <strong>SEMPRE</strong> un micologo esperto o il servizio ASL della tua
            zona prima del consumo. In caso di dubbio,{' '}
            <strong>NON raccogliere il fungo.</strong>
          </p>
          <p className="text-gray-500">
            Centri micologici ASL: cerca &ldquo;ispettorato micologico&rdquo; + la tua provincia
            su Google Maps.
          </p>
        </div>
      </div>
    </section>
  );
}
