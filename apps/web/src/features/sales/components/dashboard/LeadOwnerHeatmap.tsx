import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { US07LeadOwnerPerformance } from '../../types/sales-dashboard.types';
import { ChartCard, ChartTooltip, EmptyState, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface LeadOwnerHeatmapProps {
  data?: US07LeadOwnerPerformance;
}

// Same colours as the Lead Status donut so statuses read consistently.
const STATUS_HEADERS = [
  { key: 'new', label: 'New', dot: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', dot: '#06b6d4' },
  { key: 'qualified', label: 'Qualified', dot: '#a855f7' },
  { key: 'on_hold', label: 'On Hold', dot: '#f59e0b' },
  { key: 'lost', label: 'Lost', dot: '#ef4444' },
  { key: 'converted', label: 'Converted', dot: '#10b981' },
] as const;

interface Cell {
  owner: string;
  status: string;
  dot: string;
  count: number;
  total: number;
}

/**
 * Lead Owner Performance: one stacked bar per rep. The bar length is the rep's total leads and each coloured
 * segment is the number of leads in that status ("Show 100%" compares the mix instead of the volume).
 */
export const LeadOwnerHeatmap: React.FC<LeadOwnerHeatmapProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Cell>();
  const [percentMode, setPercentMode] = useState(false);

  const owners = [...(data?.owners || [])].sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...owners.map((o) => o.total), 1);

  return (
    <ChartCard
      cardRef={ref}
      icon={Users}
      tone="blue"
      title="Lead Owner Performance"
      subtitle="Workload and status breakdown per sales rep"
      info="Horizontal stacked bars per rep. Bar length shows total leads and each coloured segment shows the number of leads in that status."
      footer="Rows sorted by total leads descending"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.owner}</TipTitle>
              <TipRow color={tip.data.dot} label={tip.data.status} value={`${tip.data.count} leads`} />
              <TipRow
                label="Of rep's leads"
                value={`${tip.data.total > 0 ? Math.round((tip.data.count / tip.data.total) * 100) : 0}%`}
              />
            </>
          )}
        </ChartTooltip>
      }
    >
      {owners.length === 0 ? (
        <EmptyState text="No owner data." />
      ) : (
        <>
          {/* Legend and the counts / 100% switch */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600">
              {STATUS_HEADERS.map((h) => (
                <span key={h.key} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: h.dot }} /> {h.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPercentMode((v) => !v)}
              className="cursor-pointer rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {percentMode ? 'Show counts' : 'Show 100%'}
            </button>
          </div>

          <div className="space-y-3">
            {owners.map((o) => {
              const barWidth = percentMode ? 100 : Math.max((o.total / maxTotal) * 100, 4);
              return (
                <div key={o.emp_id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate font-semibold text-slate-800" title={o.name}>
                      {o.name}
                    </span>
                    <span className="text-[10px] font-black text-slate-900">{o.total} leads</span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-slate-100">
                    <div className="flex h-full transition-all duration-300" style={{ width: `${barWidth}%` }}>
                      {STATUS_HEADERS.map((h) => {
                        const val = ((o as any)[h.key] as number) || 0;
                        if (val === 0 || o.total === 0) return null;
                        const pct = (val / o.total) * 100;
                        return (
                          <div
                            key={h.key}
                            className="flex h-full cursor-pointer items-center justify-center border-r border-white/60 text-[10px] font-bold text-white last:border-r-0 hover:brightness-110"
                            style={{ width: `${pct}%`, backgroundColor: h.dot }}
                            onMouseMove={(e) => move(e, { owner: o.name, status: h.label, dot: h.dot, count: val, total: o.total })}
                            onMouseLeave={hide}
                          >
                            {pct >= 10 ? (percentMode ? `${Math.round(pct)}%` : val) : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </ChartCard>
  );
};
