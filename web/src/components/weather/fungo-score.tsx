'use client';

import { useEffect, useRef, useState } from 'react';
import type { FungoScore as FungoScoreType } from '@/lib/weather-service';

// ─── SVG Arc helpers ───────────────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// ─── Color helpers ─────────────────────────────────────────────────────────

function scoreToColor(score: number): string {
  if (score >= 90) return '#d4ac0d'; // gold
  if (score >= 70) return '#27ae60'; // green
  if (score >= 55) return '#2ecc71'; // light green
  if (score >= 35) return '#f39c12'; // amber
  if (score >= 20) return '#e67e22'; // orange
  return '#c0392b'; // red
}

function scoreToGlow(score: number): string {
  if (score >= 90) return 'rgba(212, 172, 13, 0.45)';
  if (score >= 70) return 'rgba(39, 174, 96, 0.4)';
  if (score >= 55) return 'rgba(46, 204, 113, 0.35)';
  if (score >= 35) return 'rgba(243, 156, 18, 0.35)';
  return 'rgba(192, 57, 43, 0.3)';
}

// ─── Score Label ───────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  perfetto: 'text-yellow-400',
  ottimo: 'text-emerald-400',
  buono: 'text-green-400',
  discreto: 'text-amber-400',
  scarso: 'text-orange-400',
  pessimo: 'text-red-400',
};

// ─── Props ─────────────────────────────────────────────────────────────────

interface FungoScoreProps {
  fungoScore: FungoScoreType;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function FungoScoreGauge({ fungoScore }: FungoScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const targetScore = fungoScore.score;

  useEffect(() => {
    const duration = 1600;
    startTimeRef.current = performance.now();

    function animate(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * targetScore));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetScore]);

  // Gauge arc: starts at -135deg, ends at +135deg (270deg sweep)
  const cx = 100;
  const cy = 100;
  const r = 80;
  const startAngle = -135;
  const endAngle = 135;
  const sweepDeg = endAngle - startAngle; // 270

  const filledEndAngle = startAngle + (animatedScore / 100) * sweepDeg;

  const color = scoreToColor(animatedScore);
  const glowColor = scoreToGlow(animatedScore);
  const labelColor = LABEL_COLORS[fungoScore.label] ?? 'text-amber-400';

  const isPerfect = fungoScore.score >= 90;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Gauge */}
      <div
        className="relative"
        style={{
          filter: animatedScore > 0 ? `drop-shadow(0 0 20px ${glowColor})` : 'none',
          transition: 'filter 0.5s ease',
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-56 h-56 md:w-64 md:h-64"
          aria-label={`Fungo Score: ${fungoScore.score} su 100 — ${fungoScore.label}`}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c0392b" />
              <stop offset="35%" stopColor="#f39c12" />
              <stop offset="65%" stopColor="#27ae60" />
              <stop offset="100%" stopColor="#d4ac0d" />
            </linearGradient>
            {isPerfect && (
              <filter id="goldenGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>

          {/* Track (background arc) */}
          <path
            d={describeArc(cx, cy, r, startAngle, endAngle)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {[0, 20, 35, 55, 70, 90, 100].map((tick) => {
            const angle = startAngle + (tick / 100) * sweepDeg;
            const inner = polarToCartesian(cx, cy, 70, angle);
            const outer = polarToCartesian(cx, cy, 80, angle);
            return (
              <line
                key={tick}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Filled arc */}
          {animatedScore > 0 && (
            <path
              d={describeArc(cx, cy, r, startAngle, filledEndAngle)}
              fill="none"
              stroke={isPerfect ? 'url(#scoreGradient)' : color}
              strokeWidth="14"
              strokeLinecap="round"
              filter={isPerfect ? 'url(#goldenGlow)' : undefined}
              style={{ transition: 'stroke 0.3s ease' }}
            />
          )}

          {/* Center mushroom emoji */}
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fontSize="32"
            className={isPerfect ? 'animate-bounce' : ''}
          >
            🍄
          </text>

          {/* Score number */}
          <text
            x={cx}
            y={cy + 20}
            textAnchor="middle"
            fontSize="26"
            fontWeight="bold"
            fill={color}
            fontFamily="system-ui, sans-serif"
            style={{ transition: 'fill 0.3s ease' }}
          >
            {animatedScore}
          </text>

          {/* /100 label */}
          <text
            x={cx}
            y={cy + 36}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.4)"
            fontFamily="system-ui, sans-serif"
          >
            / 100
          </text>

          {/* Scale labels */}
          {[
            { angle: startAngle, label: '0' },
            { angle: 0, label: '50' },
            { angle: endAngle, label: '100' },
          ].map(({ angle, label }) => {
            const pos = polarToCartesian(cx, cy, 58, angle);
            return (
              <text
                key={label}
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(255,255,255,0.3)"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {/* Pulsing ring for perfect score */}
        {isPerfect && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'transparent',
              boxShadow: `0 0 0 0 ${glowColor}`,
              animation: 'pulse-ring 2s ease-out infinite',
            }}
          />
        )}
      </div>

      {/* Score label badge */}
      <div className="text-center">
        <span
          className={`text-2xl font-bold uppercase tracking-widest font-[family-name:var(--font-playfair)] ${labelColor}`}
        >
          {fungoScore.message}
        </span>
      </div>

      {/* Score breakdown */}
      <div className="w-full max-w-xs space-y-2">
        <p className="text-xs text-center text-white/40 uppercase tracking-wider mb-3">
          Dettaglio punteggio
        </p>
        {(
          [
            { key: 'rainScore', label: 'Piogge recenti', max: 30, icon: '🌧️' },
            { key: 'temperatureScore', label: 'Temperatura', max: 20, icon: '🌡️' },
            { key: 'humidityScore', label: 'Umidità', max: 20, icon: '💧' },
            { key: 'seasonScore', label: 'Stagione', max: 20, icon: '🍂' },
            { key: 'moonScore', label: 'Luna', max: 10, icon: '🌙' },
          ] as const
        ).map(({ key, label, max, icon }) => {
          const value = fungoScore.breakdown[key];
          const pct = (value / max) * 100;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm w-4 flex-shrink-0">{icon}</span>
              <span className="text-xs text-white/60 w-28 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: scoreToColor(fungoScore.score),
                    transitionDelay: '0.4s',
                  }}
                />
              </div>
              <span className="text-xs text-white/50 w-10 text-right flex-shrink-0">
                {value}/{max}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
