import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DangerBadge } from './danger-badge';
import { SeasonIndicator } from './season-indicator';
import type { Species } from '@/lib/species-data';
import { getSpeciesSlug } from '@/lib/species-data';

interface SpeciesCardProps {
  species: Species;
}

function getMushroomEmoji(edibility: Species['edibility']): string {
  switch (edibility) {
    case 'ottimo':
    case 'buono':
      return '\uD83C\uDF44';
    case 'commestibile':
      return '\uD83C\uDF44';
    case 'non_commestibile':
      return '\uD83D\uDEAB';
    case 'tossico':
      return '\u26A0\uFE0F';
    case 'mortale':
      return '\u2620\uFE0F';
    default:
      return '\uD83C\uDF44';
  }
}

export function SpeciesCard({ species }: SpeciesCardProps) {
  const slug = getSpeciesSlug(species);
  const isDangerous = species.edibility === 'tossico' || species.edibility === 'mortale';

  return (
    <Link href={`/guida/${slug}`}>
      <Card hover className={`overflow-hidden ${isDangerous ? 'ring-1 ring-red-200' : ''}`}>
        {/* Color strip header */}
        <div
          className={`
            h-2
            ${species.edibility === 'mortale'
              ? 'bg-red-600'
              : species.edibility === 'tossico'
                ? 'bg-orange-500'
                : species.edibility === 'ottimo'
                  ? 'bg-green-600'
                  : species.edibility === 'buono'
                    ? 'bg-green-500'
                    : species.edibility === 'commestibile'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
            }
          `}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{getMushroomEmoji(species.edibility)}</span>
                <h3 className="text-lg font-bold text-bark-800 truncate">
                  {species.italianName}
                </h3>
              </div>
              <p className="text-sm text-bark-400 italic truncate">
                {species.scientificName}
              </p>
            </div>
            <DangerBadge edibility={species.edibility} size="sm" />
          </div>

          {/* Description preview */}
          <p className="text-sm text-bark-500 line-clamp-2 mb-4 leading-relaxed">
            {species.capDescription}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1 text-xs text-bark-400 bg-cream-200 px-2 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {species.altitude[0]}-{species.altitude[1]}m
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-bark-400 bg-cream-200 px-2 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              {species.habitat[0]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-bark-400 bg-cream-200 px-2 py-1 rounded-lg">
              {species.family}
            </span>
          </div>

          {/* Season */}
          <SeasonIndicator
            start={species.season.start}
            end={species.season.end}
            peak={species.season.peak}
          />
        </div>
      </Card>
    </Link>
  );
}
