import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { US02LeadStatusOverview } from '../../types/sales-dashboard.types';
import { ChartCard, ChartTooltip, TipRow, TipTitle, useChartTooltip } from './ChartShell';

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6',
  Contacted: '#06b6d4',
  Qualified: '#a855f7',
  'On Hold': '#f59e0b',
  Converted: '#10b981',
  Lost: '#ef4444',
};

type Row = US02LeadStatusOverview['statuses'][number];

interface LeadStatusDonutChartProps {
  data?: US02LeadStatusOverview;
}

export const LeadStatusDonutChart: React.FC<LeadStatusDonutChartProps> = ({ data }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const { ref, tip, move, hide } = useChartTooltip<Row>();

  const total = data?.total || 0;
  const statuses = data?.statuses || [];

  const size = 176;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let acc = 0;
  const segments = statuses.map((s) => {
    const seg = { s, offset: -((acc / 100) * circumference), len: (s.percentage / 100) * circumference };
    acc += s.percentage;
    return seg;
  });

  return (
    <ChartCard
      cardRef={ref}
      icon={PieChart}
      tone="blue"
      title="Lead Status Overview"
      subtitle="Pipeline concentration across all statuses"
      info="Displays the number of leads in each status (New, Contacted, Qualified, Converted, Lost, On Hold) and the share of the whole pipeline."
      footer="Lead Status represents the current state of each lead"
      onLeave={() => {
        hide();
        setHovered(null);
      }}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.status}</TipTitle>
              <TipRow color={STATUS_COLORS[tip.data.status] || '#94a3b8'} label="Leads" value={tip.data.count} />
              <TipRow label="Share of pipeline" value={`${tip.data.percentage}%`} />
            </>
          )}
        </ChartTooltip>
      }
    >
      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
        <div className="relative flex shrink-0 items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={stroke} />
            {total > 0 &&
              segments.map(({ s, offset, len }) =>
                s.count === 0 ? null : (
                  <circle
                    key={s.status}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={STATUS_COLORS[s.status] || '#94a3b8'}
                    strokeWidth={hovered === s.status ? stroke + 5 : stroke}
                    strokeDasharray={`${len} ${circumference}`}
                    strokeDashoffset={offset}
                    opacity={hovered && hovered !== s.status ? 0.35 : 1}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHovered(s.status)}
                    onMouseMove={(e) => move(e, s)}
                    onMouseLeave={() => {
                      setHovered(null);
                      hide();
                    }}
                  />
                ),
              )}
          </svg>
          <div className="pointer-events-none absolute flex flex-col items-center">
            <span className="text-3xl font-bold tabular-nums leading-none text-slate-900">{total}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Leads</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:w-auto">
          {statuses.map((s) => (
            <div
              key={s.status}
              onMouseEnter={() => setHovered(s.status)}
              onMouseMove={(e) => move(e, s)}
              onMouseLeave={() => {
                setHovered(null);
                hide();
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                hovered === s.status || (!hovered && s.is_max) ? 'bg-slate-100' : 'hover:bg-slate-50'
              } ${hovered && hovered !== s.status ? 'opacity-50' : ''}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || '#94a3b8' }} />
              <span className="font-medium text-slate-700">{s.status}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">
                {s.count} <span className="text-[10px] font-normal text-slate-400">({s.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
};
