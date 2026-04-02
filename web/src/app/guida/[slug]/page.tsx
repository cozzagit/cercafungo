import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SpeciesDetail } from '@/components/species/species-detail';
import { Footer } from '@/components/landing/footer';
import {
  SPECIES_DATABASE,
  getSpeciesSlug,
  getSpeciesBySlug,
  EDIBILITY_LABELS,
} from '@/lib/species-data';

// ── SSG: generate all species pages at build time ──────────

export function generateStaticParams() {
  return SPECIES_DATABASE.map((species) => ({
    slug: getSpeciesSlug(species),
  }));
}

// ── Dynamic metadata ───────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const species = getSpeciesBySlug(slug);

  if (!species) {
    return { title: 'Specie non trovata — CercaFungo' };
  }

  const isDangerous = species.edibility === 'tossico' || species.edibility === 'mortale';
  const edibilityLabel = EDIBILITY_LABELS[species.edibility];

  return {
    title: `${species.italianName} (${species.scientificName}) — CercaFungo`,
    description: `${species.italianName}: ${edibilityLabel}. ${species.capDescription.slice(0, 120)}... Habitat, stagione, sosia pericolosi.`,
    openGraph: {
      title: `${species.italianName} — ${edibilityLabel}`,
      description: `${species.capDescription.slice(0, 150)}...`,
      type: 'article',
    },
    other: isDangerous
      ? { 'danger-level': species.edibility }
      : undefined,
  };
}

// ── Page ───────────────────────────────────────────────────

export default async function SpeciesPage({ params }: PageProps) {
  const { slug } = await params;
  const species = getSpeciesBySlug(slug);

  if (!species) {
    notFound();
  }

  // Schema.org structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${species.italianName} (${species.scientificName})`,
    description: species.capDescription,
    author: {
      '@type': 'Organization',
      name: 'CercaFungo',
    },
    about: {
      '@type': 'Thing',
      name: species.scientificName,
      alternateName: species.italianName,
      description: species.edibilityNote,
    },
  };

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-cream-50/90 backdrop-blur-md border-b border-cream-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-2xl">{'\uD83C\uDF44'}</span>
              <span className="text-lg font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
                CercaFungo
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/guida"
                className="text-sm text-bark-400 hover:text-bark-700 transition-colors font-medium"
              >
                Guida Specie
              </Link>
              <Link
                href="/"
                className="text-sm text-bark-400 hover:text-bark-700 transition-colors font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-bark-400 mb-8">
          <Link href="/" className="hover:text-bark-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/guida" className="hover:text-bark-600 transition-colors">Guida</Link>
          <span>/</span>
          <span className="text-bark-600 font-medium">{species.italianName}</span>
        </nav>

        <SpeciesDetail species={species} />

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-cream-400">
          <Link
            href="/guida"
            className="inline-flex items-center gap-2 text-forest-600 hover:text-forest-700 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Torna alla guida completa
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
