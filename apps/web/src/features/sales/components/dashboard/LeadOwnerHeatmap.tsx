import React from 'react';
import { Users } from 'lucide-react';
import { US07LeadOwnerPerformance } from '../../types/sales-dashboard.types';
import { ChartCard, ChartTooltip, EmptyState, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface LeadOwnerHeatmapProps {
  data?: US07LeadOwnerPerformance;
}

const STATUS_HEADERS = [
  { key: 'new', label: 'New', color: 'text-blue-600', dot: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', color: 'text-cyan-600', dot: '#06b6d4' },
  { key: 'qualified', label: 'Qualified', color: 'text-purple-600', dot: '#a855f7' },
  { key: 'on_hold', label: 'On Hold', color: 'text-amber-600', dot: '#f59e0b' },
  { key: 'lost', label: 'Lost', color: 'text-rose-600', dot: '#ef4444' },
  { key: 'converted', label: 'Converted', color: 'text-emerald-600', dot: '#10b981' },
];

function getShade(val: number, max: number) {
  if (val === 0 || max === 0) return 'bg-slate-50 text-slate-300';
  const ratio = val / max;
  if (ratio > 0.75) return 'bg-blue-600 text-white font-bold';
  if (ratio > 0.5) return 'bg-blue-400 text-white font-semibold';
  if (ratio > 0.25) return 'bg-blue-200 text-blue-900 font-semibold';
  return 'bg-blue-100 text-blue-800 font-medium';
}

interface Cell {
  owner: string;
  status: string;
  dot: string;
  count: number;
  total: number;
}

export const LeadOwnerHeatmap: React.FC<LeadOwnerHeatmapProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Cell>();
  const owners = data?.owners || [];

  let maxCell = 0;
  owners.forEach((o) =>
    STATUS_HEADERS.forEach((h) => {
      const v = (o as any)[h.key] || 0;
      if (v > maxCell) maxCell = v;
    }),
  );

  return (
    <ChartCard
      cardRef={ref}
      icon={Users}
      tone="blue"
      title="Lead Owner Performance"
      subtitle="Workload and status breakdown per sales rep"
      info="Heatmap grid showing lead allocation and status progress across owners. Darker cell shades represent higher lead concentrations."
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] border-separate border-spacing-y-1 text-center text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider">
                <th className="pb-1 pl-2 text-left font-semibold text-slate-500">Rep / Admin</th>
                {STATUS_HEADERS.map((h) => (
                  <th key={h.key} className={`px-1 pb-1 ${h.color}`}>
                    {h.label}
                  </th>
                ))}
                <th className="px-1 pb-1 text-slate-800">Total</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={o.emp_id}>
                  <td className="max-w-[110px] truncate pl-2 text-left text-xs font-medium text-slate-800" title={o.name}>
                    {o.name}
                  </td>
                  {STATUS_HEADERS.map((h) => {
                    const val = (o as any)[h.key] || 0;
                    return (
                      <td
                        key={h.key}
                        className="cursor-pointer px-0.5"
                        onMouseMove={(e) => move(e, { owner: o.name, status: h.label, dot: h.dot, count: val, total: o.total })}
                        onMouseLeave={hide}
                      >
                        <div className={`flex h-8 items-center justify-center rounded-md text-xs tabular-nums transition hover:ring-2 hover:ring-blue-300 ${getShade(val, maxCell)}`}>
                          {val}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-1 text-sm font-bold tabular-nums text-slate-900">{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
};
