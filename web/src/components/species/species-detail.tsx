import Image from 'next/image';
import { DangerBadge } from './danger-badge';
import { SeasonIndicator } from './season-indicator';
import { LookalikeSection } from './lookalike-section';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Species } from '@/lib/species-data';

function getSpeciesImagePath(species: Species): string | null {
  if (species.id === 'sconosciuto') return null;
  const folder = species.id.replace(/-/g, '_');
  return `/species/${folder}.jpg`;
}

interface SpeciesDetailProps {
  species: Species;
}


export function SpeciesDetail({ species }: SpeciesDetailProps) {
  const isDangerous = species.edibility === 'tossico' || species.edibility === 'mortale';

  return (
    <article className="max-w-4xl mx-auto">
      {/* Danger warning for toxic species — very prominent */}
      {isDangerous && (
        <div className={`
          mb-8 p-6 rounded-2xl border-2 relative overflow-hidden
          ${species.edibility === 'mortale'
            ? 'bg-red-50 border-red-400 shadow-lg shadow-red-100'
            : 'bg-orange-50 border-orange-300'
          }
        `}>
          {/* Danger stripe pattern on left edge */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
            species.edibility === 'mortale' ? 'bg-red-600' : 'bg-orange-500'
          }`} />
          {/* Repeating danger stripe for mortale */}
          {species.edibility === 'mortale' && (
            <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
              Pericolo di morte
            </div>
          )}
          <div className="flex items-start gap-4 pl-3">
            <span className="text-4xl flex-shrink-0">
              {species.edibility === 'mortale' ? '\u2620\uFE0F' : '\u26A0\uFE0F'}
            </span>
            <div>
              <h2 className={`text-xl font-bold mb-2 ${
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
              {species.edibility === 'mortale' && (
                <p className="text-xs text-red-600 font-semibold mt-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Portare SEMPRE i funghi al centro micologico ASL prima del consumo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header — botanical illustration style */}
      <header className="mb-8 pb-8 border-b border-cream-400/50">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <DangerBadge edibility={species.edibility} size="lg" />
          <span className="text-xs font-semibold text-bark-400 uppercase tracking-wider bg-cream-200 px-2.5 py-1 rounded-lg">{species.family}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-2 leading-tight">
          {species.italianName}
        </h1>
        <p className="text-xl text-bark-400 italic mb-3">
          {species.scientificName}
        </p>
        {species.alternativeNames.length > 0 && (
          <p className="text-sm text-bark-400">
            <span className="font-semibold text-bark-500">Nomi alternativi:</span>{' '}
            {species.alternativeNames.join(', ')}
          </p>
        )}

        {/* Species photo (only shown for verified species) */}
        {getSpeciesImagePath(species) && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-cream-300 shadow-sm bg-cream-100">
            <Image
              src={getSpeciesImagePath(species)!}
              alt={`${species.italianName} (${species.scientificName})`}
              width={600}
              height={400}
              className="w-full h-auto object-cover max-h-[350px]"
              unoptimized
            />
            <p className="text-[10px] text-bark-400 px-3 py-1.5 bg-cream-50">
              Foto di riferimento — l&apos;aspetto può variare in base a età, umidità e habitat
            </p>
          </div>
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

          {/* Lookalikes — full comparison panel */}
          <LookalikeSection species={species} />

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
