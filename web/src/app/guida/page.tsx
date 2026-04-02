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
                href="/condizioni"
                className="text-sm text-bark-400 hover:text-bark-700 transition-colors font-medium hidden sm:block"
              >
                Condizioni
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
          <nav className="flex items-center gap-2 text-sm text-bark-400 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-forest-600 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Home
            </Link>
            <svg className="w-3 h-3 text-bark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-bark-600 font-medium">Guida alle Specie</span>
          </nav>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
              Guida alle Specie
            </h1>
            <span className="hidden sm:inline-flex items-center bg-forest-100 text-forest-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
              48 specie
            </span>
          </div>
          <p className="text-bark-400 max-w-2xl leading-relaxed">
            Enciclopedia completa delle specie fungine presenti nel database CercaFungo.
            Focalizzata sulle Alpi e la Valtellina. Cerca per nome, famiglia o filtra per commestibilita.
          </p>
        </header>

        {/* Safety warning — prominent */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-300/80 rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
          <div className="flex items-start gap-3 pl-2">
            <span className="text-xl flex-shrink-0">{'\u26A0\uFE0F'}</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Avviso di sicurezza</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Questo database e uno strumento di supporto
                all&apos;identificazione. <strong>NON sostituisce</strong> il parere di un micologo esperto o il controllo ASL.
                In caso di dubbio, <strong>non consumare il fungo</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Species grid with search/filter */}
        <SpeciesGrid species={SPECIES_DATABASE} />
      </main>

      <Footer />
    </>
  );
}
