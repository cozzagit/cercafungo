/**
 * CercaFungo — Moon Phase Calculator
 *
 * Pure math calculation, no external API needed.
 * Based on the Conway/Meeus algorithm.
 */

export type MoonPhaseName =
  | 'Luna Nuova'
  | 'Primo Quarto'
  | 'Luna Piena'
  | 'Ultimo Quarto'
  | 'Luna Crescente'
  | 'Gibbosa Crescente'
  | 'Gibbosa Calante'
  | 'Luna Calante';

export interface MoonPhaseResult {
  /** Phase name in Italian */
  name: MoonPhaseName;
  /** Illumination percentage 0-100 */
  illumination: number;
  /** True if the moon is waxing (getting bigger) */
  isWaxing: boolean;
  /** True if the moon is waning (getting smaller) */
  isWaning: boolean;
  /** Emoji symbol for the phase */
  emoji: string;
  /** Phase index 0-7 (0=new, 4=full) */
  phaseIndex: number;
  /** Fungo hunting wisdom in Italian */
  wisdom: string;
}

/**
 * Calculate the moon phase for a given date.
 * Uses the Julian Day Number method.
 */
export function getMoonPhase(date: Date = new Date()): MoonPhaseResult {
  // Calculate Julian Day Number
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Known new moon reference: January 6, 2000 = JDN 2451549.5
  const knownNewMoonJDN = 2451549.5;
  const synodicPeriod = 29.53058867; // days

  const daysSinceNew = (jdn - knownNewMoonJDN) % synodicPeriod;
  const normalizedDays = daysSinceNew < 0 ? daysSinceNew + synodicPeriod : daysSinceNew;

  // Illumination: 0 at new moon, 100 at full moon
  const phaseAngle = (normalizedDays / synodicPeriod) * 360;
  const illumination = Math.round(
    ((1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2) * 100
  );

  // Phase index 0-7
  const phaseIndex = Math.round((normalizedDays / synodicPeriod) * 8) % 8;

  const isWaxing = normalizedDays < synodicPeriod / 2;
  const isWaning = !isWaxing;

  const phaseData = getPhaseData(phaseIndex);

  return {
    name: phaseData.name,
    illumination,
    isWaxing,
    isWaning,
    emoji: phaseData.emoji,
    phaseIndex,
    wisdom: phaseData.wisdom,
  };
}

function getPhaseData(phaseIndex: number): {
  name: MoonPhaseName;
  emoji: string;
  wisdom: string;
} {
  const phases: Record<
    number,
    { name: MoonPhaseName; emoji: string; wisdom: string }
  > = {
    0: {
      name: 'Luna Nuova',
      emoji: '🌑',
      wisdom:
        'Luna nuova: il bosco si prepara. Ottimo momento per pianificare la raccolta dei prossimi giorni.',
    },
    1: {
      name: 'Luna Crescente',
      emoji: '🌒',
      wisdom:
        'Luna crescente: i funghi stanno spingendo. Buon momento, ma aspetta ancora qualche giorno.',
    },
    2: {
      name: 'Primo Quarto',
      emoji: '🌓',
      wisdom:
        'Primo quarto: la linfa sale. La tradizione dice che è il momento giusto per uscire.',
    },
    3: {
      name: 'Gibbosa Crescente',
      emoji: '🌔',
      wisdom:
        'Gibbosa crescente: energia al massimo. I cercatori esperti dicono che i funghi escono in abbondanza.',
    },
    4: {
      name: 'Luna Piena',
      emoji: '🌕',
      wisdom:
        "Luna piena: notte di raccolta secondo la tradizione. L'umidità notturna favorisce lo sviluppo.",
    },
    5: {
      name: 'Gibbosa Calante',
      emoji: '🌖',
      wisdom:
        'Gibbosa calante: i funghi ci sono ancora. Raccogli prima che inizino a deteriorarsi.',
    },
    6: {
      name: 'Ultimo Quarto',
      emoji: '🌗',
      wisdom:
        "Ultimo quarto: fase calante. I porcini di qualità si trovano ancora, ma l'apice è passato.",
    },
    7: {
      name: 'Luna Calante',
      emoji: '🌘',
      wisdom:
        'Luna calante: la tradizione contadina considera questo il momento migliore per i porcini. Prova!',
    },
  };

  return phases[phaseIndex] ?? phases[0];
}

/**
 * Returns true if the moon phase is considered favorable for mushroom hunting
 * according to Italian folk tradition (waning moon = better)
 */
export function isMoonFavorable(phase: MoonPhaseResult): boolean {
  return phase.isWaning || phase.phaseIndex === 4;
}
