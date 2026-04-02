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
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-0.5">
        {MONTH_LABELS.map((label, i) => {
          const month = i + 1;
          const active = isInSeason(month, start, end);
          const isPeak = month === peak;

          return (
            <div
              key={month}
              className={`
                flex flex-col items-center gap-0.5 flex-1
              `}
              title={`${MONTH_FULL[i]}${active ? ' - in stagione' : ''}${isPeak ? ' (picco)' : ''}`}
            >
              <span className="text-[10px] text-bark-400 font-medium">{label}</span>
              <div
                className={`
                  w-full h-2.5 rounded-sm transition-colors
                  ${isPeak
                    ? 'bg-amber-500'
                    : active
                      ? 'bg-forest-400'
                      : 'bg-cream-300'
                  }
                `}
              />
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
      </div>
    </div>
  );
}
