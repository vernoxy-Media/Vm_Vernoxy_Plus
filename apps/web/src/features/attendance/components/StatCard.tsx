import React from 'react';
import { HelpCircle, LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  tooltip: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  tooltip,
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBgColor} ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              <div className="hidden group-hover/tip:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[11px] font-normal leading-tight shadow-md whitespace-nowrap z-20">
                {tooltip}
              </div>
            </div>
          </div>
          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight block mt-0.5">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};
