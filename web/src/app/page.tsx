import Link from 'next/link';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { SpeciesPreview } from '@/components/landing/species-preview';
import { Footer } from '@/components/landing/footer';

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-forest-900/85 backdrop-blur-lg border-b border-forest-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🍄</span>
            <span className="text-lg font-bold text-white font-[family-name:var(--font-playfair)]">
              CercaFungo
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/guida"
              className="text-sm text-forest-200 hover:text-white transition-colors font-medium hidden sm:block"
            >
              Guida Specie
            </Link>
            <Link
              href="/mappa"
              className="text-sm text-forest-200 hover:text-white transition-colors font-medium hidden sm:block"
            >
              Mappa
            </Link>
            <Link
              href="/condizioni"
              className="text-sm text-forest-200 hover:text-white transition-colors font-medium hidden sm:block"
            >
              Condizioni
            </Link>
            <Link
              href="/scanner"
              className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Prova Scanner
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─── SCANNER AI SECTION ──────────────────────────────────────────── */

function ScannerSection() {
  return (
    <section className="py-20 md:py-28 bg-forest-900 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-forest-600/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-forest-600/60 to-transparent" />
      <div className="absolute -top-20 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-forest-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm text-amber-300 font-semibold uppercase tracking-wide">Novità — Scanner AI</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-[family-name:var(--font-playfair)] leading-tight mb-6">
              Scanner AI
              <br />
              <span className="text-amber-400">in Tempo Reale</span>
            </h2>

            <p className="text-lg text-forest-200 leading-relaxed mb-8">
              Apri il browser sul telefono, punta la fotocamera verso il fungo e l&apos;AI
              lo identifica in meno di un secondo — <strong className="text-white">senza installare nessuna app</strong>.
              Il modello YOLOv8 gira direttamente sul tuo dispositivo.
            </p>

            {/* Feature list */}
            <ul className="space-y-4 mb-10">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  ),
                  label: 'Range di rilevamento: 2–5 metri per funghi grandi',
                  sub: 'Ottimizzato per porcini e morchelle in condizioni reali di bosco',
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  ),
                  label: '~8 FPS di inferenza in tempo reale',
                  sub: 'Il modello è compresso e ottimizzato per mobile',
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  ),
                  label: '100% offline dopo il primo caricamento',
                  sub: 'Nessun dato inviato in cloud — zero privacy risk',
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-forest-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  ),
                  label: 'Vibrazione + alert su rilevamento ad alta confidenza',
                  sub: 'Quando l\'AI è sicura oltre il 70%, il telefono vibra',
                },
                {
                  icon: (
                    <svg className="w-5 h-5 text-forest-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ),
                  label: 'Bounding box colorati per confidenza',
                  sub: 'Verde >70% · Giallo 40–70% · Rosso <40%',
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-forest-700/60 border border-forest-600/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{item.label}</p>
                    <p className="text-forest-400 text-xs mt-0.5">{item.sub}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/scanner"
              className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Prova Ora — Dal Browser
            </Link>
            <p className="text-forest-400 text-xs mt-3">Nessuna installazione. Apri e scansiona.</p>
          </div>

          {/* Right — phone mockup with detection UI */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute inset-0 bg-amber-500/10 rounded-[3rem] blur-3xl scale-110 pointer-events-none" />

              {/* Phone */}
              <div className="relative w-[300px] h-[620px] bg-bark-900 rounded-[3.5rem] p-3.5 shadow-2xl ring-1 ring-white/10">
                {/* Screen */}
                <div className="w-full h-full bg-bark-950 rounded-[3rem] overflow-hidden relative flex flex-col">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-bark-950">
                    <span className="text-[10px] text-bark-400 font-medium">9:41</span>
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-bark-900 rounded-full" />
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-bark-400" fill="currentColor" viewBox="0 0 24 24"><path d="M1.5 8.5C5 5 10 3 12 3s7 2 10.5 5.5L21 11c-2.5-2.5-6-4-9-4s-6.5 1.5-9 4L1.5 8.5z"/><path d="M5.5 12.5C7.5 10.5 10 9.5 12 9.5s4.5 1 6.5 3L17 14c-1.5-1.5-3-2.5-5-2.5s-3.5 1-5 2.5l-1.5-1.5z"/><circle cx="12" cy="17" r="2.5"/></svg>
                      <svg className="w-3 h-3 text-bark-400" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="4" height="10" rx="1"/><rect x="7" y="5" width="4" height="12" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/><rect x="17" y="1" width="4" height="16" rx="1"/></svg>
                      <svg className="w-4 h-2.5 text-green-400" fill="currentColor" viewBox="0 0 24 10"><rect x="0" y="0" width="22" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="22" y="3" width="2" height="4" rx="1"/><rect x="1.5" y="1.5" width="17" height="7" rx="1.5" fill="currentColor"/></svg>
                    </div>
                  </div>

                  {/* App header */}
                  <div className="bg-bark-900 px-5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍄</span>
                      <span className="text-sm font-bold text-white">CercaFungo</span>
                    </div>
                    <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 font-semibold">LIVE</span>
                  </div>

                  {/* Camera viewfinder */}
                  <div className="flex-1 relative bg-gradient-to-br from-forest-900 via-forest-800 to-bark-800 overflow-hidden">
                    {/* Fake forest background texture */}
                    <div className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `radial-gradient(circle at 30% 40%, #4a7c2e33 0%, transparent 50%),
                          radial-gradient(circle at 70% 60%, #2d501633 0%, transparent 40%),
                          radial-gradient(circle at 50% 80%, #1a300d44 0%, transparent 60%)`,
                      }}
                    />

                    {/* Viewfinder corners */}
                    <div className="absolute inset-5 pointer-events-none z-10">
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-amber-400/80 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-amber-400/80 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-amber-400/80 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-amber-400/80 rounded-br-md" />
                    </div>

                    {/* Detection boxes */}
                    {/* Porcino — green (high confidence) */}
                    <div className="absolute z-20 border-2 border-green-400 rounded-sm shadow-lg shadow-green-400/30"
                      style={{ top: '20%', left: '25%', width: '45%', height: '40%' }}>
                      <div className="absolute -top-5 left-0 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        Boletus edulis 94%
                      </div>
                    </div>

                    {/* Second mushroom — amber (medium confidence) */}
                    <div className="absolute z-20 border-2 border-amber-400 rounded-sm shadow-lg shadow-amber-400/20"
                      style={{ top: '55%', left: '55%', width: '28%', height: '25%' }}>
                      <div className="absolute -top-5 left-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        Boletus 62%
                      </div>
                    </div>

                    {/* Mushroom emoji placeholders */}
                    <span className="absolute z-10 text-4xl" style={{ top: '22%', left: '33%' }}>🍄</span>
                    <span className="absolute z-10 text-2xl opacity-60" style={{ top: '57%', left: '59%' }}>🍄</span>

                    {/* Scan line */}
                    <div className="absolute left-5 right-5 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent z-30 pointer-events-none"
                      style={{ animation: 'scanLinePhone 2.5s ease-in-out infinite' }}
                    />

                    {/* FPS counter */}
                    <div className="absolute top-2 right-2 z-30 bg-bark-900/70 text-green-400 text-[9px] font-mono px-1.5 py-0.5 rounded">
                      8 FPS
                    </div>
                  </div>

                  {/* Result bar */}
                  <div className="bg-bark-900 px-4 py-3 border-t border-bark-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[9px] text-bark-400 uppercase tracking-wide font-semibold">Identificato</p>
                        <p className="text-sm font-bold text-white">Porcino — Boletus edulis</p>
                      </div>
                      <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-500/30">
                        COMMESTIBILE
                      </span>
                    </div>
                    {/* Confidence bar */}
                    <div className="w-full h-1.5 bg-bark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: '94%' }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-bark-500">Confidenza</span>
                      <span className="text-[9px] text-green-400 font-bold">94%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge — offline */}
              <div className="absolute -left-20 top-20 bg-forest-700 border border-forest-600 rounded-xl px-3 py-2.5 shadow-xl animate-float" style={{ animationDelay: '0.7s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">100% Offline</p>
                    <p className="text-[9px] text-forest-400">Nessun cloud</p>
                  </div>
                </div>
              </div>

              {/* Floating badge — vibration */}
              <div className="absolute -right-20 top-40 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 shadow-xl animate-float" style={{ animationDelay: '1.4s' }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">📳</span>
                  <div>
                    <p className="text-[10px] font-bold text-amber-300">Vibrazione</p>
                    <p className="text-[9px] text-amber-400/70">Alta confidenza!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inline keyframe for scan line */}
            <style>{`
              @keyframes scanLinePhone {
                0%   { top: 20%; opacity: 0; }
                10%  { opacity: 0.6; }
                90%  { opacity: 0.6; }
                100% { top: 80%; opacity: 0; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CREDIBILITY / TECH SECTION ─────────────────────────────────── */

function CredibilitySection() {
  const techBadges = [
    {
      icon: '🤖',
      title: 'YOLOv8',
      desc: 'Lo stesso motore usato nei droni agricoli di precision farming',
    },
    {
      icon: '🌿',
      title: 'iNaturalist',
      desc: '13.000+ osservazioni verificate da esperti micologi',
    },
    {
      icon: '🏔️',
      title: 'Training Alpino',
      desc: 'Foto reali di porcini e morchelle dalla Valtellina alle Dolomiti',
    },
    {
      icon: '📱',
      title: 'WebML / ONNX',
      desc: 'Modello esportato in ONNX — gira nel browser senza backend',
    },
  ];

  const dataStats = [
    { value: '48', label: 'Specie Alpine Catalogate', color: 'text-amber-400' },
    { value: '16', label: 'Bounding Box Porcini Annotati', color: 'text-green-400' },
    { value: '400+', label: 'Foto Morchella nel Training Set', color: 'text-forest-300' },
    { value: '13k+', label: 'Osservazioni iNaturalist', color: 'text-amber-400' },
  ];

  return (
    <section className="py-20 md:py-28 bg-cream-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cream-400 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
            Tecnologia e dati
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-bark-800 font-[family-name:var(--font-playfair)]">
            Costruito sul serio per chi fa sul serio
          </h2>
          <p className="mt-4 text-lg text-bark-400 max-w-2xl mx-auto">
            Non l&apos;ennesimo riconoscitore generico. Un modello addestrato su dati alpini reali,
            ottimizzato per il campo.
          </p>
        </div>

        {/* Data stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {dataStats.map((s) => (
            <div key={s.label} className="text-center p-5 bg-cream-50 rounded-2xl border border-cream-400/50 shadow-sm">
              <p className={`text-3xl md:text-4xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-bark-400 mt-2 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tech badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {techBadges.map((b) => (
            <div
              key={b.title}
              className="bg-cream-50 border border-cream-400/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="text-3xl mb-3">{b.icon}</div>
              <h3 className="font-bold text-bark-800 text-sm mb-1 group-hover:text-forest-700 transition-colors">
                {b.title}
              </h3>
              <p className="text-xs text-bark-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom disclaimer / credibility strip */}
        <div className="mt-12 p-5 bg-forest-800 rounded-2xl border border-forest-700 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              Lo scanner AI è uno strumento di supporto, non un sostituto alla conoscenza micologica.
            </p>
            <p className="text-forest-400 text-xs mt-0.5">
              Consulta sempre un esperto o un libro micologico prima di consumare qualsiasi fungo raccolto.
              La sicurezza alimentare dipende da te.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS ────────────────────────────────────────────────── */

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

/* ─── DOWNLOAD / FINAL CTA ────────────────────────────────────────── */

function DownloadCTA() {
  return (
    <section id="download" className="py-20 md:py-28 bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-forest-500/10 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <span className="text-6xl mb-6 block">🍄</span>
        <h2 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-playfair)] mb-4">
          Pronto per la prossima uscita?
        </h2>
        <p className="text-lg text-forest-200 mb-10 max-w-lg mx-auto">
          Porta l&apos;AI nel bosco con te. Scanner, guida specie, mappa dei ritrovamenti.
          Tutto offline, tutto gratis.
        </p>

        {/* Three primary CTAs */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <Link
            href="/scanner"
            className="inline-flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Prova lo Scanner
          </Link>
          <Link
            href="/mappa"
            className="inline-flex items-center justify-center gap-3 bg-forest-600 hover:bg-forest-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-forest-800/30 hover:-translate-y-0.5"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Mappa Ritrovamenti
          </Link>
          <Link
            href="/guida"
            className="inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-2xl font-semibold text-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Guida Specie
          </Link>
        </div>

        <p className="text-forest-400 text-sm mb-8">
          Scanner disponibile da browser. App mobile in arrivo.
        </p>

        {/* App store badges */}
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3.5 rounded-xl font-semibold transition-all opacity-60 cursor-not-allowed"
            title="In arrivo"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-forest-300 leading-none">In arrivo su</p>
              <p className="text-base font-bold leading-tight">App Store</p>
            </div>
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3.5 rounded-xl font-semibold transition-all opacity-60 cursor-not-allowed"
            title="In arrivo"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zM14.852 13.06l2.29 1.32-7.53 4.35 5.24-5.67zM17.141 9.62l-2.29 1.32-5.24-5.67 7.53 4.35zM18.328 10.3l2.042 1.18c.552.319.552.72 0 1.04l-2.042 1.18-2.623-1.7 2.623-1.7z"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] text-forest-300 leading-none">In arrivo su</p>
              <p className="text-base font-bold leading-tight">Google Play</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── PAGE ────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ScannerSection />
        <HowItWorks />
        <SpeciesPreview />
        <CredibilitySection />
        <Testimonials />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  );
}
