import React, { useState } from 'react';
import { Info, Users } from 'lucide-react';
import { US07LeadOwnerPerformance } from '../../types/sales-dashboard.types';

interface LeadOwnerHeatmapProps {
  data?: US07LeadOwnerPerformance;
}

const STATUS_HEADERS = [
  { key: 'new', label: 'New', color: 'text-blue-600' },
  { key: 'contacted', label: 'Contacted', color: 'text-cyan-600' },
  { key: 'qualified', label: 'Qualified', color: 'text-purple-600' },
  { key: 'on_hold', label: 'On Hold', color: 'text-amber-600' },
  { key: 'lost', label: 'Lost', color: 'text-rose-600' },
  { key: 'converted', label: 'Converted', color: 'text-emerald-600' },
];

function getShade(val: number, max: number) {
  if (val === 0 || max === 0) return 'bg-slate-50 text-slate-400';
  const ratio = val / max;
  if (ratio > 0.75) return 'bg-blue-600 text-white font-black';
  if (ratio > 0.5) return 'bg-blue-400 text-white font-bold';
  if (ratio > 0.25) return 'bg-blue-200 text-blue-900 font-semibold';
  return 'bg-blue-50 text-blue-800 font-medium';
}

export const LeadOwnerHeatmap: React.FC<LeadOwnerHeatmapProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ owner: string; status: string; count: number; total: number } | null>(null);

  const owners = data?.owners || [];
  let maxCell = 0;
  owners.forEach((o) => {
    STATUS_HEADERS.forEach((h) => {
      const v = (o as any)[h.key] || 0;
      if (v > maxCell) maxCell = v;
    });
  });

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
              Heatmap grid showing lead allocation and status progress across owners. Darker cell shades represent higher lead concentrations.
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="my-3 overflow-x-auto">
        {hoveredCell && (
          <div className="text-center text-[10px] font-bold text-slate-700 mb-1.5">
            {hoveredCell.owner} • {hoveredCell.status}: <span className="text-blue-600 font-extrabold">{hoveredCell.count} leads</span>{' '}
            <span className="text-slate-400">
              ({hoveredCell.total > 0 ? Math.round((hoveredCell.count / hoveredCell.total) * 100) : 0}% of rep's leads)
            </span>
          </div>
        )}

        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-1.5 text-left pl-2 font-bold text-slate-600">Rep / Admin</th>
              {STATUS_HEADERS.map((h) => (
                <th key={h.key} className={`py-1.5 px-1 ${h.color}`}>
                  {h.label}
                </th>
              ))}
              <th className="py-1.5 px-1 text-slate-800 font-black">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {owners.map((o) => (
              <tr key={o.emp_id} className="hover:bg-slate-50/50 transition">
                <td className="py-1.5 pl-2 text-left font-semibold text-slate-800 truncate max-w-[90px]">{o.name}</td>
                {STATUS_HEADERS.map((h) => {
                  const val = (o as any)[h.key] || 0;
                  const shade = getShade(val, maxCell);
                  return (
                    <td
                      key={h.key}
                      className="p-1 cursor-pointer"
                      onMouseEnter={() => setHoveredCell({ owner: o.name, status: h.label, count: val, total: o.total })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div className={`h-6 w-full rounded flex items-center justify-center text-[10px] transition ${shade}`}>
                        {val}
                      </div>
                    </td>
                  );
                })}
                <td className="py-1 px-1 font-black text-slate-900 bg-slate-50/70 text-[11px]">{o.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Rows sorted by total leads descending
      </div>
    </div>
  );
};
