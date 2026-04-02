import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient — deep forest */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f06] via-forest-800 to-forest-900" />

      {/* Mist / fog layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 right-0 h-40 bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.03] blur-2xl animate-mist" />
        <div className="absolute top-2/3 left-0 right-0 h-32 bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.02] blur-3xl animate-mist-slow" />
      </div>

      {/* Forest silhouette overlay — multi-layer depth */}
      <div className="absolute bottom-0 left-0 right-0 h-40 opacity-15">
        <svg viewBox="0 0 1440 140" className="w-full h-full" preserveAspectRatio="none">
          <path
            fill="#0d1f06"
            d="M0,140 L0,100 Q40,60 80,85 T180,55 T280,70 T380,45 T500,65 T620,35 T740,55 T860,30 T980,50 T1100,25 T1220,45 T1340,20 T1440,35 L1440,140 Z"
          />
          <path
            fill="#112008"
            opacity="0.5"
            d="M0,140 L0,110 Q70,80 140,95 T300,75 T440,88 T580,68 T720,82 T860,62 T1000,78 T1140,55 T1300,72 T1440,50 L1440,140 Z"
          />
        </svg>
      </div>

      {/* Decorative ambient glows */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-forest-600/20 rounded-full blur-2xl" />
      <div className="absolute top-40 right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-forest-500/15 rounded-full blur-2xl" />
      <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-amber-400/8 rounded-full blur-2xl" />

      {/* Subtle dew-like sparkle dots */}
      <div className="absolute top-32 left-[15%] w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute top-48 left-[45%] w-1.5 h-1.5 bg-amber-300/20 rounded-full animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      <div className="absolute top-24 right-[30%] w-1 h-1 bg-white/25 rounded-full animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="animate-fade-in-up">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-forest-600/40 backdrop-blur-sm border border-forest-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-forest-200 font-medium">AI addestrata sui porcini della Valtellina</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-[family-name:var(--font-playfair)] leading-tight mb-6">
              Riconosce il{' '}
              <span className="text-amber-400">porcino</span>
              <br />
              prima che tu
              <br />
              ti avvicini
            </h1>

            <p className="text-lg md:text-xl text-forest-200 leading-relaxed mb-3 max-w-lg">
              Scanner AI in tempo reale direttamente dal browser del telefono.
              Nessuna app da installare. Funziona anche a 1.800m senza segnale.
            </p>
            <p className="text-sm text-amber-300/80 font-medium mb-8 max-w-lg">
              Addestrato su porcini alpini e morchelle — 48 specie da Valtellina alle Dolomiti.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/scanner"
                className="inline-flex items-center gap-2.5 bg-amber-500 hover:bg-amber-600 text-white px-7 py-4 rounded-xl font-bold text-base transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Prova lo Scanner Ora
              </Link>
              <Link
                href="/guida"
                className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-7 py-4 rounded-xl font-semibold text-base transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                Guida Specie
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-forest-300 text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                100% offline
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Nessuna app da installare
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                48 specie alpine
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Gratis
              </span>
            </div>
          </div>

          {/* Phone mockup with scanner simulation */}
          <div className="hidden lg:flex justify-center animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-amber-500/15 rounded-[3rem] blur-3xl scale-95" />
              <div className="absolute inset-0 bg-forest-500/10 rounded-[3rem] blur-3xl scale-110 -translate-y-4" />

              {/* Phone frame — realistic device */}
              <div className="relative w-[280px] h-[580px] bg-gradient-to-b from-[#1a1a1a] to-[#111] rounded-[3rem] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]">
                <div className="w-full h-full bg-gradient-to-br from-forest-700 to-forest-900 rounded-[2.5rem] overflow-hidden flex flex-col">
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-bark-900 rounded-full z-10" />

                  {/* Scanner UI */}
                  <div className="flex-1 relative flex flex-col items-center justify-center p-6 pt-10">
                    {/* Viewfinder corners */}
                    <div className="absolute inset-8 pointer-events-none">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
                    </div>

                    {/* Fake camera background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-forest-800 via-forest-700 to-bark-800 opacity-60" />

                    {/* Detection bounding box — porcino */}
                    <div className="relative z-10 w-36 h-32 border-2 border-green-400 rounded-lg flex flex-col items-center justify-center shadow-lg shadow-green-400/20">
                      <div className="absolute -top-5 left-0 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-t-md whitespace-nowrap">
                        Boletus edulis — 94%
                      </div>
                      <span className="text-5xl">🍄</span>
                    </div>

                    {/* Scan line animation */}
                    <div
                      className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-70"
                      style={{
                        animation: 'scanLine 2s ease-in-out infinite',
                        top: '35%',
                      }}
                    />
                  </div>

                  {/* Bottom bar */}
                  <div className="bg-bark-900/80 backdrop-blur-sm px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-forest-300 font-medium">Rilevato</p>
                      <p className="text-xs font-bold text-green-400">Porcino — COMMESTIBILE</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-500/80 flex items-center justify-center animate-pulse-glow">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating confidence card */}
              <div className="absolute -left-20 top-24 bg-cream-50 rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-bark-700">Porcino — 94%</p>
                    <p className="text-[9px] text-green-600 font-semibold">Alta confidenza</p>
                  </div>
                </div>
              </div>

              {/* Floating offline badge */}
              <div className="absolute -right-16 top-40 bg-forest-700 rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '1.2s' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 14.828a5 5 0 010-7.072" />
                    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                  <div>
                    <p className="text-[9px] font-bold text-white">Offline</p>
                    <p className="text-[9px] text-green-400">Attivo</p>
                  </div>
                </div>
              </div>

              {/* Floating location card */}
              <div className="absolute -right-14 bottom-32 bg-cream-50 rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">🗺️</span>
                  <div>
                    <p className="text-xs font-bold text-bark-700">Val Masino</p>
                    <p className="text-[10px] text-bark-400">1.240m s.l.m.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan line keyframe — injected inline since Tailwind can't handle arbitrary keyframes */}
      <style>{`
        @keyframes scanLine {
          0% { top: 30%; opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { top: 70%; opacity: 0; }
        }
      `}</style>

      {/* Bottom wave — organic flowing shape */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
          <path
            fill="var(--cream-200)"
            d="M0,45 C240,70 480,20 720,40 C960,60 1200,25 1440,45 L1440,80 L0,80 Z"
            opacity="0.5"
          />
          <path
            fill="var(--cream-200)"
            d="M0,55 C360,30 600,65 900,45 C1100,32 1300,55 1440,50 L1440,80 L0,80 Z"
          />
        </svg>
      </div>
    </section>
  );
}
