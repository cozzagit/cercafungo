import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-bark-800 text-bark-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{'\uD83C\uDF44'}</span>
              <span className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">
                CercaFungo
              </span>
            </div>
            <p className="text-bark-300 leading-relaxed max-w-md mb-6">
              Il tuo assistente AI per l&apos;identificazione dei funghi.
              Progettato per le Alpi e la Valtellina, funziona completamente offline.
            </p>
            <div className="flex items-center gap-2 p-3 bg-bark-700 rounded-xl max-w-sm">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-bark-300">
                CercaFungo e uno strumento di supporto. NON sostituisce il parere di un micologo esperto o dell&apos;ASL.
              </p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Risorse
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/guida" className="text-bark-300 hover:text-white transition-colors text-sm">
                  Guida alle Specie
                </Link>
              </li>
              <li>
                <a href="#" className="text-bark-300 hover:text-white transition-colors text-sm">
                  Scarica per iOS
                </a>
              </li>
              <li>
                <a href="#" className="text-bark-300 hover:text-white transition-colors text-sm">
                  Scarica per Android
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Progetto
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="https://vibecanyon.com" target="_blank" rel="noopener noreferrer" className="text-bark-300 hover:text-white transition-colors text-sm">
                  VibeCanyon
                </a>
              </li>
              <li>
                <a href="#" className="text-bark-300 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-bark-300 hover:text-white transition-colors text-sm">
                  Contatti
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-bark-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-bark-400">
            &copy; {new Date().getFullYear()} CercaFungo. Tutti i diritti riservati.
          </p>
          <p className="text-xs text-bark-500">
            Fatto con amore in Valtellina
          </p>
        </div>
      </div>
    </footer>
  );
}
