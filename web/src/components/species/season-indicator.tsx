interface SeasonIndicatorProps {
  start: number;
  end: number;
  peak: number;
}

const MONTH_LABELS = [
  'G', 'F', 'M', 'A', 'M', 'G',
  'L', 'A', 'S', 'O', 'N', 'D',
];

const MONTH_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function isInSeason(month: number, start: number, end: number): boolean {
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

export function SeasonIndicator({ start, end, peak }: SeasonIndicatorProps) {
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-0.5">
        {MONTH_LABELS.map((label, i) => {
          const month = i + 1;
          const active = isInSeason(month, start, end);
          const isPeak = month === peak;
          const isCurrent = month === currentMonth;

          return (
            <div
              key={month}
              className="flex flex-col items-center gap-1 flex-1"
              title={`${MONTH_FULL[i]}${active ? ' - in stagione' : ''}${isPeak ? ' (picco)' : ''}`}
            >
              <span className={`text-[10px] font-medium ${
                isCurrent ? 'text-forest-600 font-bold' : 'text-bark-400'
              }`}>
                {label}
              </span>
              <div
                className={`
                  w-full h-3 rounded-sm transition-colors relative
                  ${isPeak
                    ? 'bg-amber-500 shadow-sm shadow-amber-500/30'
                    : active
                      ? 'bg-forest-400'
                      : 'bg-cream-300'
                  }
                `}
              >
                {/* Current month indicator dot */}
                {isCurrent && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-forest-600 ring-1 ring-cream-50" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-bark-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-forest-400 inline-block" /> Stagione
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Picco
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-forest-600 inline-block" /> Oggi
        </span>
      </div>
    </div>
  );
}
