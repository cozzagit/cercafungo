import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-bark-800 text-bark-200 relative">
      {/* Mountain / forest silhouette */}
      <div className="absolute -top-px left-0 right-0 overflow-hidden">
        <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none" style={{ display: 'block' }}>
          {/* Mountains layer — back */}
          <path
            fill="#3e2b1c"
            opacity="0.3"
            d="M0,80 L0,50 L120,25 L200,40 L320,15 L420,35 L520,8 L620,30 L720,12 L820,32 L920,5 L1020,28 L1120,18 L1220,38 L1320,10 L1440,30 L1440,80 Z"
          />
          {/* Trees layer — front */}
          <path
            fill="var(--bark-700)"
            d="M0,80 L0,55 Q30,35 60,50 L80,40 L100,52 Q140,30 170,48 L200,38 L220,50 Q260,28 300,45 L340,32 L370,48 Q410,25 450,42 L490,30 L520,46 Q560,22 600,40 L640,28 L680,44 Q720,20 760,38 L800,26 L840,42 Q880,18 920,36 L960,24 L1000,40 Q1040,16 1080,34 L1120,22 L1160,38 Q1200,14 1240,32 L1280,20 L1320,36 Q1360,12 1400,30 L1440,20 L1440,80 Z"
          />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
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
            {/* Safety disclaimer — prominent */}
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800/30 rounded-xl max-w-sm">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-xs text-red-300 font-semibold mb-1">Avvertenza legale</p>
                <p className="text-xs text-bark-300 leading-relaxed">
                  CercaFungo e uno strumento di supporto. <strong className="text-red-300">NON sostituisce</strong> il parere di un micologo esperto o il controllo dell&apos;ASL. Non consumare funghi identificati solo tramite questa app.
                </p>
              </div>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-9 h-9 rounded-full bg-bark-700 hover:bg-bark-600 flex items-center justify-center text-bark-300 hover:text-white transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-bark-700 hover:bg-bark-600 flex items-center justify-center text-bark-300 hover:text-white transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-bark-700 hover:bg-bark-600 flex items-center justify-center text-bark-300 hover:text-white transition-colors" aria-label="YouTube">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
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
                <Link href="/condizioni" className="text-bark-300 hover:text-white transition-colors text-sm">
                  Condizioni Meteo
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
