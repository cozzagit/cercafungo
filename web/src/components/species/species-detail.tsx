import { DangerBadge } from './danger-badge';
import { SeasonIndicator } from './season-indicator';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Species } from '@/lib/species-data';
import { getSpeciesById, EDIBILITY_LABELS } from '@/lib/species-data';

interface SpeciesDetailProps {
  species: Species;
}

function DangerLevelBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    mortale: { bg: 'bg-red-100', text: 'text-red-800', label: 'MORTALE' },
    alto: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Alto' },
    medio: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medio' },
    basso: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Basso' },
  };
  const c = config[level] ?? config.basso;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function SpeciesDetail({ species }: SpeciesDetailProps) {
  const isDangerous = species.edibility === 'tossico' || species.edibility === 'mortale';

  return (
    <article className="max-w-4xl mx-auto">
      {/* Danger warning for toxic species */}
      {isDangerous && (
        <div className={`
          mb-8 p-6 rounded-2xl border-2
          ${species.edibility === 'mortale'
            ? 'bg-red-50 border-red-300'
            : 'bg-orange-50 border-orange-300'
          }
        `}>
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">
              {species.edibility === 'mortale' ? '\u2620\uFE0F' : '\u26A0\uFE0F'}
            </span>
            <div>
              <h2 className={`text-lg font-bold mb-1 ${
                species.edibility === 'mortale' ? 'text-red-800' : 'text-orange-800'
              }`}>
                {species.edibility === 'mortale'
                  ? 'FUNGO MORTALE'
                  : 'FUNGO TOSSICO'}
              </h2>
              <p className={`text-sm leading-relaxed ${
                species.edibility === 'mortale' ? 'text-red-700' : 'text-orange-700'
              }`}>
                {species.edibilityNote}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <DangerBadge edibility={species.edibility} size="lg" />
          <span className="text-sm text-bark-400">{species.family}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-2">
          {species.italianName}
        </h1>
        <p className="text-xl text-bark-400 italic mb-3">
          {species.scientificName}
        </p>
        {species.alternativeNames.length > 0 && (
          <p className="text-sm text-bark-400">
            Nomi alternativi: {species.alternativeNames.join(', ')}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identification */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-bark-700 flex items-center gap-2">
                <span className="text-2xl">\uD83D\uDD0D</span>
                Identificazione
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-bark-600 uppercase tracking-wide mb-1">
                  Cappello
                </h3>
                <p className="text-bark-600 leading-relaxed">{species.capDescription}</p>
                <p className="text-sm text-bark-400 mt-1">
                  Colori: {species.capColor.join(', ')} &middot; Diametro: {species.capDiameterCm[0]}-{species.capDiameterCm[1]} cm
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bark-600 uppercase tracking-wide mb-1">
                  Gambo
                </h3>
                <p className="text-bark-600 leading-relaxed">{species.stemDescription}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bark-600 uppercase tracking-wide mb-1">
                  Lamelle / Imenoforo
                </h3>
                <p className="text-bark-600 leading-relaxed">{species.gillsDescription}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bark-600 uppercase tracking-wide mb-1">
                  Carne
                </h3>
                <p className="text-bark-600 leading-relaxed">{species.fleshDescription}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-bark-600 uppercase tracking-wide mb-1">
                  Spore
                </h3>
                <p className="text-bark-600">{species.sporeColor}</p>
              </div>
            </CardContent>
          </Card>

          {/* Edibility note (for edible species) */}
          {!isDangerous && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-bark-700 flex items-center gap-2">
                  <span className="text-2xl">\uD83C\uDF7D\uFE0F</span>
                  Commestibilita
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-bark-600 leading-relaxed">{species.edibilityNote}</p>
              </CardContent>
            </Card>
          )}

          {/* Lookalikes */}
          {species.confusableWith.length > 0 && (
            <Card className={isDangerous ? '' : 'border-orange-200'}>
              <CardHeader>
                <h2 className="text-xl font-bold text-bark-700 flex items-center gap-2">
                  <span className="text-2xl">\u26A0\uFE0F</span>
                  Specie simili — Attenzione!
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {species.confusableWith.map((lookalike) => {
                  const lookalikeSpecies = getSpeciesById(lookalike.speciesId);
                  return (
                    <div
                      key={lookalike.speciesId}
                      className={`
                        p-4 rounded-xl border
                        ${lookalike.dangerLevel === 'mortale'
                          ? 'bg-red-50 border-red-200'
                          : lookalike.dangerLevel === 'alto'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-cream-100 border-cream-400'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-bark-700">
                          {lookalikeSpecies?.italianName ?? lookalike.speciesId}
                        </span>
                        {lookalikeSpecies && (
                          <span className="text-sm text-bark-400 italic">
                            ({lookalikeSpecies.scientificName})
                          </span>
                        )}
                        <DangerLevelBadge level={lookalike.dangerLevel} />
                      </div>
                      <p className="text-sm text-bark-600 leading-relaxed">
                        {lookalike.differences}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Fun fact */}
          <Card className="bg-forest-50 border-forest-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">\uD83D\uDCA1</span>
                <div>
                  <h3 className="font-bold text-forest-800 mb-1">Lo sapevi?</h3>
                  <p className="text-forest-700 leading-relaxed">{species.funFact}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Season */}
          <Card>
            <CardHeader>
              <h3 className="font-bold text-bark-700">Stagione</h3>
            </CardHeader>
            <CardContent>
              <SeasonIndicator
                start={species.season.start}
                end={species.season.end}
                peak={species.season.peak}
              />
            </CardContent>
          </Card>

          {/* Ecology */}
          <Card>
            <CardHeader>
              <h3 className="font-bold text-bark-700">Ecologia</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-bark-500 uppercase tracking-wide mb-1">Habitat</p>
                <div className="flex flex-wrap gap-1.5">
                  {species.habitat.map((h) => (
                    <span key={h} className="text-xs bg-forest-100 text-forest-700 px-2 py-1 rounded-lg">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-bark-500 uppercase tracking-wide mb-1">Altitudine</p>
                <p className="text-sm text-bark-600">{species.altitude[0]} - {species.altitude[1]} m s.l.m.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-bark-500 uppercase tracking-wide mb-1">Substrato</p>
                <p className="text-sm text-bark-600">{species.substrate}</p>
              </div>
              {species.symbioticTrees.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-bark-500 uppercase tracking-wide mb-1">Alberi simbionti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {species.symbioticTrees.map((t) => (
                      <span key={t} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Characteristics */}
          <Card>
            <CardHeader>
              <h3 className="font-bold text-bark-700">Caratteristiche</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-bark-500">Taglia</span>
                <span className="text-sm font-medium text-bark-700 capitalize">{species.typicalSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-bark-500">Crescita</span>
                <span className="text-sm font-medium text-bark-700 capitalize">{species.growthPattern}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-bark-500">Visibilita</span>
                <span className="text-sm font-medium text-bark-700 capitalize">{species.visibility}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </article>
  );
}
