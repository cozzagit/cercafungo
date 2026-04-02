import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SpeciesCard } from '@/components/species/species-card';
import { SPECIES_DATABASE } from '@/lib/species-data';

export function SpeciesPreview() {
  // Pick a curated selection: a top edible, a famous toxic, and a few interesting ones
  const showcaseIds = [
    'boletus-edulis',
    'cantharellus-cibarius',
    'amanita-phalloides',
    'amanita-caesarea',
    'morchella-esculenta',
    'amanita-muscaria',
  ];

  const showcaseSpecies = showcaseIds
    .map((id) => SPECIES_DATABASE.find((s) => s.id === id))
    .filter(Boolean) as typeof SPECIES_DATABASE;

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
            Guida alle specie
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
            48 specie, dalla Valtellina alle Alpi
          </h2>
          <p className="mt-4 text-lg text-bark-400 max-w-2xl mx-auto">
            Ogni scheda include descrizione completa, stagionalita, habitat,
            sosia pericolosi e curiosita. Tutto verificato da fonti micologiche.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {[
            { value: '48', label: 'Specie' },
            { value: '15', label: 'Commestibili', color: 'text-green-600' },
            { value: '5', label: 'Mortali', color: 'text-red-600' },
            { value: '8', label: 'Tossiche', color: 'text-orange-500' },
            { value: '15+', label: 'Famiglie' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-cream-50 rounded-xl border border-cream-400/50">
              <p className={`text-2xl font-bold ${stat.color ?? 'text-bark-800'}`}>{stat.value}</p>
              <p className="text-xs text-bark-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Species cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {showcaseSpecies.map((s) => (
            <SpeciesCard key={s.id} species={s} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/guida">
            <Button size="lg" variant="primary">
              Esplora tutte le 48 specie
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
