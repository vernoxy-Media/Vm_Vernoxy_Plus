import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ProgressStatRowProps {
  label: string;
  current: number;
  target?: number;
  unit?: string;
  gradientClass: string;
  icon?: LucideIcon;
  badgeBgColor?: string;
  badgeTextColor?: string;
}

export const ProgressStatRow: React.FC<ProgressStatRowProps> = ({
  label,
  current,
  target,
  unit = 'hrs',
  gradientClass,
  icon: Icon,
  badgeBgColor = 'bg-slate-100',
  badgeTextColor = 'text-slate-700',
}) => {
  const percent = target && target > 0 ? Math.min(Math.round((current / target) * 100), 100) : null;
  const isCapped = target && current >= target;

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`w-6 h-6 rounded-lg ${badgeBgColor} ${badgeTextColor} flex items-center justify-center shrink-0`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-xs font-bold text-slate-800">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-extrabold text-slate-900 tracking-tight font-mono">
              {current}
            </span>
            {target !== undefined ? (
              <span className="text-[11px] font-semibold text-slate-400 font-mono"> / {target} {unit}</span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400"> {unit}</span>
            )}
          </div>
          {percent !== null && (
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
              isCapped
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {percent}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar with contrasting color gradient */}
      <div className="h-2.5 w-full bg-slate-100 border border-slate-200/90 rounded-full overflow-hidden flex items-center">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${gradientClass}`}
          style={{ width: target ? `${percent}%` : `${Math.min(current * 10, 100)}%` }}
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={target || 100}
          role="progressbar"
          aria-label={`${label}: ${current} of ${target || ''} ${unit}`}
        />
      </div>
    </div>
  );
};

