import React from 'react';

export interface ProgressStatRowProps {
  label: string;
  current: number;
  target?: number;
  unit?: string;
  barColor: string;
}

export const ProgressStatRow: React.FC<ProgressStatRowProps> = ({
  label,
  current,
  target,
  unit = 'hrs',
  barColor,
}) => {
  const percent = target && target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const displayText = target !== undefined ? `${current} / ${target} ${unit}` : `${current} ${unit}`;

  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-colors">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="font-bold text-slate-800">{label}</span>
        <span className="font-extrabold text-slate-900 tracking-tight">{displayText}</span>
      </div>

      {/* Progress Bar with contrasting color */}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: target ? `${percent}%` : `${Math.min(current * 10, 100)}%` }}
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={target || 100}
          role="progressbar"
          aria-label={`${label}: ${displayText}`}
        />
      </div>
    </div>
  );
};
