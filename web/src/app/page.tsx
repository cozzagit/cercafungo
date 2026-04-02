import Link from 'next/link';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { SpeciesPreview } from '@/components/landing/species-preview';
import { Footer } from '@/components/landing/footer';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-forest-900/80 backdrop-blur-md border-b border-forest-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">{'\uD83C\uDF44'}</span>
            <span className="text-lg font-bold text-white font-[family-name:var(--font-playfair)]">
              CercaFungo
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/guida"
              className="text-sm text-forest-200 hover:text-white transition-colors font-medium"
            >
              Guida Specie
            </Link>
            <a
              href="#download"
              className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Scarica App
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Testimonials() {
  const testimonials = [
    {
      text: 'Finalmente un\'app che funziona anche quando sono in Val Masino senza segnale. Lo scanner e incredibilmente preciso sui porcini.',
      author: 'Marco B.',
      role: 'Cercatore esperto, Sondrio',
    },
    {
      text: 'La sezione sosia pericolosi mi ha salvato da un errore con un\'Amanita. Questa app dovrebbe essere obbligatoria per chi va a funghi.',
      author: 'Laura T.',
      role: 'Appassionata, Lecco',
    },
    {
      text: 'Uso CercaFungo con i miei clienti durante le escursioni micologiche. Le schede sono complete e accurate come quelle dei miei libri.',
      author: 'Giuseppe M.',
      role: 'Guida naturalistica, Livigno',
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-cream-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
            Testimonianze
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
            Cosa dicono i cercatori
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="bg-cream-50 rounded-2xl p-6 border border-cream-400/50 shadow-sm"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-bark-600 leading-relaxed mb-6 text-sm italic">
                &ldquo;{t.text}&rdquo;
              </p>

              <div>
                <p className="font-semibold text-bark-700 text-sm">{t.author}</p>
                <p className="text-xs text-bark-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadCTA() {
  return (
    <section id="download" className="py-20 md:py-28 bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-forest-500/10 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <span className="text-6xl mb-6 block">{'\uD83C\uDF44'}</span>
        <h2 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-playfair)] mb-4">
          Pronto per la prossima uscita?
        </h2>
        <p className="text-lg text-forest-200 mb-8 max-w-lg mx-auto">
          Scarica CercaFungo gratuitamente e porta l&apos;AI nel bosco con te.
          Funziona anche senza rete.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-3 bg-white text-bark-800 hover:bg-cream-200 px-6 py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-bark-400 leading-none">Scarica su</p>
              <p className="text-base font-bold leading-tight">App Store</p>
            </div>
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-3 bg-white text-bark-800 hover:bg-cream-200 px-6 py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zM14.852 13.06l2.29 1.32-7.53 4.35 5.24-5.67zM17.141 9.62l-2.29 1.32-5.24-5.67 7.53 4.35zM18.328 10.3l2.042 1.18c.552.319.552.72 0 1.04l-2.042 1.18-2.623-1.7 2.623-1.7z"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-bark-400 leading-none">Disponibile su</p>
              <p className="text-base font-bold leading-tight">Google Play</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <SpeciesPreview />
        <Testimonials />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  );
}
