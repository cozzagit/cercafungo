import type { Metadata } from 'next';
import Link from 'next/link';
import { SpeciesGrid } from '@/components/species/species-grid';
import { Footer } from '@/components/landing/footer';
import { SPECIES_DATABASE } from '@/lib/species-data';

export const metadata: Metadata = {
  title: 'Guida alle Specie — CercaFungo',
  description:
    'Enciclopedia completa di 48 specie di funghi delle Alpi e della Valtellina. Descrizioni, habitat, stagionalita, commestibilita e sosia pericolosi.',
  openGraph: {
    title: 'Guida alle Specie — CercaFungo',
    description:
      'Enciclopedia completa di 48 specie di funghi delle Alpi e della Valtellina.',
  },
};

export default function GuidaPage() {
  return (
    <>
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
                className="text-sm text-forest-600 font-semibold"
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
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 text-sm text-bark-400 mb-4">
            <Link href="/" className="hover:text-bark-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-bark-600">Guida alle Specie</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-3">
            Guida alle Specie
          </h1>
          <p className="text-bark-400 max-w-2xl">
            Enciclopedia completa delle 48 specie fungine presenti nel database CercaFungo.
            Focalizzata sulle Alpi e la Valtellina. Cerca per nome, famiglia o filtra per commestibilita.
          </p>
        </header>

        {/* Safety warning */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{'\u26A0\uFE0F'}</span>
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Avviso di sicurezza:</strong> Questo database e uno strumento di supporto
              all&apos;identificazione. NON sostituisce il parere di un micologo esperto o il controllo ASL.
              In caso di dubbio, <strong>non consumare il fungo</strong>.
            </p>
          </div>
        </div>

        {/* Species grid with search/filter */}
        <SpeciesGrid species={SPECIES_DATABASE} />
      </main>

      <Footer />
    </>
  );
}
