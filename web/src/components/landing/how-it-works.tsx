export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Apri',
      description:
        'Avvia CercaFungo e attiva la fotocamera. L\'app funziona completamente offline grazie al modello AI integrato.',
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Scansiona',
      description:
        'Inquadra il fungo. Il modello di deep learning lo analizza in tempo reale e ti mostra le specie piu probabili con percentuale di confidenza.',
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Trova',
      description:
        'Consulta la scheda dettagliata: commestibilita, habitat, sosia pericolosi. Salva il ritrovamento con foto e posizione GPS.',
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-forest-800 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-forest-600 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-forest-600 to-transparent" />
      <div className="absolute top-20 right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-forest-500/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Come funziona
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-playfair)]">
            Tre passi, nessuna complicazione
          </h2>
          <p className="mt-4 text-lg text-forest-300 max-w-2xl mx-auto">
            CercaFungo e progettata per essere usata in mezzo al bosco,
            con le mani sporche di terra e una sola mano libera.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center group">
              {/* Connector line (only on desktop between steps) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-px bg-gradient-to-r from-forest-600 to-forest-700" />
              )}

              {/* Icon */}
              <div className="relative inline-flex">
                <div className="w-20 h-20 rounded-2xl bg-forest-700 border border-forest-600 text-amber-400 flex items-center justify-center mx-auto mb-6 group-hover:bg-forest-600 transition-colors duration-300">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 text-bark-900 rounded-full text-xs font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-forest-300 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
