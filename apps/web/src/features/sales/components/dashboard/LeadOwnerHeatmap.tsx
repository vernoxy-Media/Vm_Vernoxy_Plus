import React, { useState } from 'react';
import { Info, Users } from 'lucide-react';
import { US07LeadOwnerPerformance } from '../../types/sales-dashboard.types';

interface LeadOwnerHeatmapProps {
  data?: US07LeadOwnerPerformance;
}

// Same colours as the Lead Status donut so statuses read consistently.
const STATUS_HEADERS = [
  { key: 'new', label: 'New', color: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', color: '#06b6d4' },
  { key: 'qualified', label: 'Qualified', color: '#a855f7' },
  { key: 'on_hold', label: 'On Hold', color: '#f59e0b' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
  { key: 'converted', label: 'Converted', color: '#10b981' },
] as const;

export const LeadOwnerHeatmap: React.FC<LeadOwnerHeatmapProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [percentMode, setPercentMode] = useState(false);
  const [hovered, setHovered] = useState<{ owner: string; status: string; count: number; total: number } | null>(null);

  const owners = [...(data?.owners || [])].sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...owners.map((o) => o.total), 1);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Lead Owner Performance</h3>
            <p className="text-[11px] text-slate-500">Workload and status breakdown per sales rep</p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-7 z-30 w-64 rounded-xl bg-slate-900 p-2.5 text-[11px] text-white shadow-xl">
              Horizontal stacked bars per rep. Bar length shows total leads and each coloured segment shows the number of leads in that status.
            </div>
          )}
        </div>
      </div>

      {/* Controls + legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600">
          {STATUS_HEADERS.map((h) => (
            <span key={h.key} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: h.color }} /> {h.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPercentMode((v) => !v)}
          className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
        >
          {percentMode ? 'Show counts' : 'Show 100%'}
        </button>
      </div>

      <div className="min-h-4 mt-1 text-center text-[10px] font-bold text-slate-700">
        {hovered && (
          <>
            {hovered.owner} • {hovered.status}: <span className="text-blue-600 font-extrabold">{hovered.count} leads</span>{' '}
            <span className="text-slate-400">
              ({hovered.total > 0 ? Math.round((hovered.count / hovered.total) * 100) : 0}% of rep's leads)
            </span>
          </>
        )}
      </div>

      {/* Stacked bars */}
      <div className="my-2 space-y-3">
        {owners.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No lead owner data for this period</p>}
        {owners.map((o) => {
          const barWidth = percentMode ? 100 : Math.max((o.total / maxTotal) * 100, 4);
          return (
            <div key={o.emp_id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-800 truncate">{o.name}</span>
                <span className="text-[10px] font-black text-slate-900">{o.total} leads</span>
              </div>
              <div className="h-6 w-full rounded-md bg-slate-100 overflow-hidden">
                <div className="flex h-full transition-all duration-300" style={{ width: `${barWidth}%` }}>
                  {STATUS_HEADERS.map((h) => {
                    const val = ((o as any)[h.key] as number) || 0;
                    if (val === 0 || o.total === 0) return null;
                    const pct = (val / o.total) * 100;
                    return (
                      <div
                        key={h.key}
                        className="flex h-full items-center justify-center text-[10px] font-bold text-white border-r border-white/60 last:border-r-0 cursor-pointer hover:brightness-110 transition"
                        style={{ width: `${pct}%`, backgroundColor: h.color }}
                        title={`${h.label}: ${val}`}
                        onMouseEnter={() => setHovered({ owner: o.name, status: h.label, count: val, total: o.total })}
                        onMouseLeave={() => setHovered(null)}
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

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Rows sorted by total leads descending
      </div>
    </div>
  );
};
