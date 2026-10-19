import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SummaryCardItem {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  colorClass: string;
  badge?: string;
  subtitle?: string;
  isActive?: boolean;
}

export interface SummaryCardsProps {
  items: SummaryCardItem[];
  onSelect?: (id: string) => void;
  className?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  items,
  onSelect,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = item.isActive;

        return (
          <div
            key={item.id}
            onClick={() => onSelect?.(item.id)}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={(e) => {
              if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(item.id);
              }
            }}
            className={`group relative rounded-2xl border p-4 bg-white shadow-xs transition-all duration-200 ${
              onSelect ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
            } ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
                {item.label}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${item.colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {item.count}
              </span>
              {item.badge && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {item.badge}
                </span>
              )}
            </div>

            {item.subtitle && (
              <p className="mt-1 text-xs text-slate-500 truncate">{item.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
