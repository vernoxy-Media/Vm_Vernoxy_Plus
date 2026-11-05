import React from 'react';
import { Building2, UserX, UserCheck, Briefcase } from 'lucide-react';
import type { SalesCompanyCounters } from '../../types/sales.types';

export interface CompanyCountersProps {
  counters?: SalesCompanyCounters;
  selectedFilter: string;
  onSelectFilter: (filter: 'all' | 'not_a_lead' | 'open' | 'client' | 'lost') => void;
  isLoading?: boolean;
}

export const CompanyCounters: React.FC<CompanyCountersProps> = ({
  counters,
  selectedFilter,
  onSelectFilter,
  isLoading = false,
}) => {
  const cards = [
    {
      id: 'all' as const,
      label: 'Total Companies',
      count: counters?.total ?? 0,
      icon: Building2,
      activeColor: 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20',
      iconColor: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'not_a_lead' as const,
      label: 'Not a Lead',
      count: counters?.not_a_lead ?? 0,
      icon: UserX,
      activeColor: 'border-slate-500 bg-slate-100/60 ring-2 ring-slate-400/20',
      iconColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'open' as const,
      label: 'Open Leads',
      count: counters?.open_leads ?? 0,
      icon: UserCheck,
      activeColor: 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20',
      iconColor: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'client' as const,
      label: 'Converted to Client',
      count: counters?.converted_to_client ?? 0,
      icon: Briefcase,
      activeColor: 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20',
      iconColor: 'bg-emerald-100 text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            aria-pressed={isSelected}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 text-left shadow-2xs transition-all ${
              isSelected ? card.activeColor : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconColor}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold leading-none tracking-tight text-slate-900">
                {isLoading ? <span className="block h-5 w-12 animate-pulse rounded bg-slate-200" /> : card.count.toLocaleString('en-IN')}
              </span>
              <span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{card.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
