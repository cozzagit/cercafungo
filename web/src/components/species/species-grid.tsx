'use client';

import { useState, useMemo } from 'react';
import { SpeciesCard } from './species-card';
import type { Species } from '@/lib/species-data';

interface SpeciesGridProps {
  species: Species[];
}

type EdibilityFilter = 'tutti' | Species['edibility'];

const EDIBILITY_FILTERS: { value: EdibilityFilter; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'ottimo', label: 'Ottimo' },
  { value: 'buono', label: 'Buono' },
  { value: 'commestibile', label: 'Commestibile' },
  { value: 'non_commestibile', label: 'Non comm.' },
  { value: 'tossico', label: 'Tossico' },
  { value: 'mortale', label: 'Mortale' },
];

export function SpeciesGrid({ species }: SpeciesGridProps) {
  const [search, setSearch] = useState('');
  const [edibilityFilter, setEdibilityFilter] = useState<EdibilityFilter>('tutti');

  const filtered = useMemo(() => {
    let results = species;

    if (edibilityFilter !== 'tutti') {
      results = results.filter((s) => s.edibility === edibilityFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      results = results.filter(
        (s) =>
          s.italianName.toLowerCase().includes(q) ||
          s.scientificName.toLowerCase().includes(q) ||
          s.alternativeNames.some((n) => n.toLowerCase().includes(q)) ||
          s.family.toLowerCase().includes(q)
      );
    }

    return results;
  }, [species, search, edibilityFilter]);

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bark-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, famiglia o nome scientifico..."
            className="w-full pl-12 pr-4 py-3.5 bg-cream-50 border border-cream-400 rounded-xl
              text-bark-700 placeholder:text-bark-300
              focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent
              transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {EDIBILITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEdibilityFilter(f.value)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all
                ${edibilityFilter === f.value
                  ? 'bg-forest-600 text-white shadow-md'
                  : 'bg-cream-100 text-bark-500 hover:bg-cream-300'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-bark-400 mb-4">
        {filtered.length} {filtered.length === 1 ? 'specie trovata' : 'specie trovate'}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <SpeciesCard key={s.id} species={s} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-bark-400">Nessuna specie trovata</p>
          <p className="text-sm text-bark-300 mt-2">Prova a cambiare i filtri di ricerca</p>
        </div>
      )}
    </div>
  );
}
