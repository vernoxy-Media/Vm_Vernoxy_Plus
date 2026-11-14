import React from 'react';
import { Timer } from 'lucide-react';

/** What the user typed: minutes and seconds, as text so a half-typed number is never rewritten. */
export interface DurationValue {
  m: string;
  s: string;
}

export const EMPTY_DURATION: DurationValue = { m: '', s: '' };

/** Total seconds, or null while nothing is entered. */
export function durationSeconds(v: DurationValue): number | null {
  if (v.m.trim() === '' && v.s.trim() === '') return null;
  return (Number(v.m) || 0) * 60 + (Number(v.s) || 0);
}

/** Why the length is not acceptable, or null when it is fine. Used before saving. */
export function durationError(v: DurationValue): string | null {
  const total = durationSeconds(v);
  if (total === null || total < 1) return 'Please enter how long the call lasted, for example 3 min 28 sec.';
  if (Number(v.s) > 59) return 'Seconds go from 0 to 59.';
  if (total >= 86_400) return 'A call cannot be longer than 23 h 59 min.';
  return null;
}

/** 208 → "3 min 28 sec", 3600 → "1 h", 45 → "45 sec". */
export function formatCallDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds < 1) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : '', s ? `${s} sec` : ''].filter(Boolean).join(' ');
}

const BOX =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-12 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 min-h-[44px]';

/** "How long was the call?": minutes and seconds, like 3 min 28 sec. */
export const CallDurationInput: React.FC<{ value: DurationValue; onChange: (v: DurationValue) => void; error?: string | null; compact?: boolean }> = ({ value, onChange, error, compact }) => {
  const digits = (t: string, max: number) => t.replace(/\D/g, '').slice(0, max);
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        <Timer className="h-3.5 w-3.5 text-gray-500" /> How long was the call? <span className="text-red-500">*</span>
      </label>
      <div className={`grid grid-cols-2 gap-2 ${compact ? '' : 'max-w-sm'}`}>
        <div className="relative">
          <input
            inputMode="numeric"
            aria-label="Minutes"
            placeholder="0"
            value={value.m}
            onChange={(e) => onChange({ ...value, m: digits(e.target.value, 3) })}
            className={BOX}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">min</span>
        </div>
        <div className="relative">
          <input
            inputMode="numeric"
            aria-label="Seconds"
            placeholder="0"
            value={value.s}
            onChange={(e) => onChange({ ...value, s: digits(e.target.value, 2) })}
            className={BOX}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">sec</span>
        </div>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};
