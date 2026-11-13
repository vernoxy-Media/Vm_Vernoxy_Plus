import React from 'react';

/**
 * The colour code of a leave type comes from master data. Every class is written out in full so Tailwind can see it;
 * blue, indigo and purple follow the colour theme the person chose.
 */
const RING_TEXT: Record<string, string> = {
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  green: 'text-emerald-500',
  amber: 'text-amber-500',
  purple: 'text-purple-500',
  rose: 'text-rose-500',
  indigo: 'text-indigo-500',
  teal: 'text-teal-500',
  slate: 'text-slate-400',
};

export function ringTone(code?: string | null): string {
  return RING_TEXT[(code || '').toLowerCase()] || RING_TEXT.slate!;
}

/** A ring that fills as leave is used up: `value` is what is left, `total` what was given. */
export const BalanceRing: React.FC<{
  value: number;
  total: number;
  tone?: string | null;
  size?: number;
  children?: React.ReactNode;
  label: string;
}> = ({ value, total, tone, size = 68, children, label }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const left = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" width={size} height={size} className="-rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-slate-100" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={`stroke-current ${ringTone(tone)} transition-[stroke-dashoffset] duration-700`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - left)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  );
};

/** Whole days from one YYYY-MM-DD to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "Starts in 3 days", "Starts tomorrow", "On leave now", "Ended 2 days ago". */
export function whenLabel(from: string, to: string, today: string): string {
  if (from <= today && today <= to) return 'On leave now';
  const until = daysBetween(today, from);
  if (until === 1) return 'Starts tomorrow';
  if (until > 1) return `Starts in ${until} days`;
  const ago = daysBetween(to, today);
  return ago === 1 ? 'Ended yesterday' : `Ended ${ago} days ago`;
}
