import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900" />

      {/* Forest silhouette overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
        <svg viewBox="0 0 1440 120" className="w-full h-full" preserveAspectRatio="none">
          <path
            fill="#112008"
            d="M0,120 L0,80 Q60,40 120,70 T240,50 T360,65 T480,45 T600,60 T720,40 T840,55 T960,35 T1080,50 T1200,30 T1320,45 T1440,25 L1440,120 Z"
          />
        </svg>
      </div>

      {/* Decorative mushroom shapes */}
      <div className="absolute top-20 left-10 w-24 h-24 bg-forest-600/20 rounded-full blur-2xl" />
      <div className="absolute top-40 right-20 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-forest-500/15 rounded-full blur-2xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-forest-600/40 backdrop-blur-sm border border-forest-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-forest-200 font-medium">AI per la micologia alpina</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-[family-name:var(--font-playfair)] leading-tight mb-6">
              Il tuo secondo paio
              <br />
              di occhi{' '}
              <span className="text-amber-400">nel bosco</span>
            </h1>

            <p className="text-lg md:text-xl text-forest-200 leading-relaxed mb-8 max-w-lg">
              Identifica i funghi con l&apos;intelligenza artificiale.
              48 specie delle Alpi, scanner in tempo reale,
              mappa dei ritrovamenti. Tutto offline.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="xl" variant="accent">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Scarica per iOS
              </Button>
              <Button size="xl" variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zM14.852 13.06l2.29 1.32-7.53 4.35 5.24-5.67zM17.141 9.62l-2.29 1.32-5.24-5.67 7.53 4.35zM18.328 10.3l2.042 1.18c.552.319.552.72 0 1.04l-2.042 1.18-2.623-1.7 2.623-1.7z"/>
                </svg>
                Scarica per Android
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-8 text-forest-300 text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Gratis
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Funziona offline
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                48 specie alpine
              </span>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="hidden lg:flex justify-center animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-amber-500/20 rounded-[3rem] blur-3xl scale-90" />

              {/* Phone frame */}
              <div className="relative w-[280px] h-[580px] bg-bark-900 rounded-[3rem] p-3 shadow-2xl ring-1 ring-white/10">
                <div className="w-full h-full bg-gradient-to-br from-forest-700 to-forest-900 rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center">
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-bark-900 rounded-full" />

                  {/* App content mockup */}
                  <div className="text-center p-8">
                    <div className="text-6xl mb-4">{'\uD83C\uDF44'}</div>
                    <h3 className="text-xl font-bold text-white mb-2">CercaFungo</h3>
                    <p className="text-forest-300 text-sm mb-6">Punta la fotocamera verso un fungo</p>

                    {/* Fake scan button */}
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/80 flex items-center justify-center animate-pulse-glow">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -left-16 top-24 bg-cream-50 rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{'\uD83C\uDF44'}</span>
                  <div>
                    <p className="text-xs font-bold text-bark-700">Porcino</p>
                    <p className="text-[10px] text-green-600 font-semibold">98% match</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-12 bottom-32 bg-cream-50 rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{'\uD83D\uDDFA\uFE0F'}</span>
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

      {/* Bottom wave */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 60" className="w-full" preserveAspectRatio="none">
          <path
            fill="var(--cream-200)"
            d="M0,30 Q360,60 720,30 T1440,30 L1440,60 L0,60 Z"
          />
        </svg>
      </div>
    </section>
  );
}
