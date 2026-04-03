import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🍄</div>
        <h1 className="text-3xl font-bold text-bark-800 font-[family-name:var(--font-playfair)] mb-2">
          Pagina non trovata
        </h1>
        <p className="text-bark-500 text-sm mb-6">
          Questa pagina non esiste. Forse il fungo si è nascosto nel sottobosco!
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Torna alla Home
          </Link>
          <Link
            href="/guida"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-bark-200 hover:bg-bark-50 text-bark-700 rounded-xl font-semibold text-sm transition-colors"
          >
            Guida Specie
          </Link>
        </div>
      </div>
    </div>
  );
}
