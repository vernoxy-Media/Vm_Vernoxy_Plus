import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface DurationFieldProps {
  value?: number | null;
  onChange: (minutes: number | null) => void;
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function formatMinutesToHuman(minutes?: number | null): string {
  if (minutes == null || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function parseDurationInput(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const str = raw.trim().toLowerCase();

  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = str.match(/(\d+)\s*m/);

  if (hourMatch || minMatch) {
    const hours = hourMatch ? parseFloat(hourMatch[1]) : 0;
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    const total = Math.round(hours * 60 + mins);
    return total > 0 ? total : null;
  }

  const plain = parseFloat(str);
  if (!isNaN(plain) && plain > 0) {
    return Math.round(plain);
  }
  return null;
}

export const DurationField: React.FC<DurationFieldProps> = ({
  value,
  onChange,
  id = 'duration-field',
  label = 'Allocated Duration',
  error,
  disabled = false,
}) => {
  const [text, setText] = useState<string>(formatMinutesToHuman(value));

  useEffect(() => {
    setText(formatMinutesToHuman(value));
  }, [value]);

  const handleBlur = () => {
    if (!text.trim()) {
      onChange(null);
      return;
    }
    const mins = parseDurationInput(text);
    if (mins != null && mins <= 14400) {
      onChange(mins);
      setText(formatMinutesToHuman(mins));
    } else if (mins != null && mins > 14400) {
      onChange(14400);
      setText('240h');
    } else {
      onChange(null);
      setText('');
    }
  };

  const setPreset = (mins: number) => {
    onChange(mins);
    setText(formatMinutesToHuman(mins));
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Clock className="h-4 w-4" />
        </div>
        <input
          type="text"
          id={id}
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          placeholder="e.g. 2h 30m, 45m"
          className={`block w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm transition-all focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-100'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
        />
      </div>

      {/* Preset pills */}
      <div className="flex items-center gap-1.5 pt-0.5">
        {[
          { label: '30m', mins: 30 },
          { label: '1h', mins: 60 },
          { label: '2h', mins: 120 },
          { label: '4h', mins: 240 },
          { label: '8h', mins: 480 },
        ].map((p) => (
          <button
            key={p.mins}
            type="button"
            onClick={() => setPreset(p.mins)}
            disabled={disabled}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
};
