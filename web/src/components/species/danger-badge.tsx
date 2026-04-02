import type { Species } from '@/lib/species-data';

const EDIBILITY_CONFIG: Record<
  Species['edibility'],
  { label: string; className: string; icon: string }
> = {
  ottimo: {
    label: 'Ottimo commestibile',
    className: 'edibility-ottimo',
    icon: '\u2713\u2713',
  },
  buono: {
    label: 'Buon commestibile',
    className: 'edibility-buono',
    icon: '\u2713',
  },
  commestibile: {
    label: 'Commestibile',
    className: 'edibility-commestibile',
    icon: '\u2713',
  },
  non_commestibile: {
    label: 'Non commestibile',
    className: 'edibility-non_commestibile',
    icon: '\u2014',
  },
  tossico: {
    label: 'TOSSICO',
    className: 'edibility-tossico',
    icon: '\u26A0',
  },
  mortale: {
    label: 'MORTALE',
    className: 'edibility-mortale',
    icon: '\u2620',
  },
};

interface DangerBadgeProps {
  edibility: Species['edibility'];
  size?: 'sm' | 'md' | 'lg';
}

export function DangerBadge({ edibility, size = 'md' }: DangerBadgeProps) {
  const config = EDIBILITY_CONFIG[edibility];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-bold rounded-full
        ${config.className}
        ${sizeClasses[size]}
      `}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
