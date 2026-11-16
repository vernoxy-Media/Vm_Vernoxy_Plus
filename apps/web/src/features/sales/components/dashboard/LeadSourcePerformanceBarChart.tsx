import React from 'react';
import { BarChart } from 'lucide-react';
import { US05LeadSourcePerformance } from '../../types/sales-dashboard.types';
import { ChartCard, ChartTooltip, EmptyState, LegendDot, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface LeadSourcePerformanceBarChartProps {
  data?: US05LeadSourcePerformance;
}

type Source = US05LeadSourcePerformance['sources'][number];

export const LeadSourcePerformanceBarChart: React.FC<LeadSourcePerformanceBarChartProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Source>();
  const sources = data?.sources || [];
  const maxLeads = Math.max(...sources.map((s) => s.leads), 1);
  const w = (v: number) => (v > 0 ? `${Math.max((v / maxLeads) * 100, 3)}%` : '0%');

  return (
    <ChartCard
      cardRef={ref}
      icon={BarChart}
      tone="indigo"
      title="Lead Source Performance"
      subtitle="Leads, converted and lost by source"
      info="Clustered horizontal bars comparing all 8 lead sources: Leads (indigo), Converted (green) and Lost (red), with overall conversion rate % at the end."
      footer="Sorted from most leads to fewest"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.source}</TipTitle>
              <TipRow color="#4f46e5" label="Leads" value={tip.data.leads} />
              <TipRow color="#10b981" label="Converted" value={tip.data.converted} />
              <TipRow color="#f43f5e" label="Lost" value={tip.data.lost} />
              <TipRow color="#94a3b8" label="Open" value={tip.data.open} />
              <TipRow label="Conversion" value={tip.data.conversion_rate !== null ? `${tip.data.conversion_rate}%` : 'N/A'} />
            </>
          )}
        </ChartTooltip>
      }
    >
      {sources.length === 0 ? (
        <EmptyState text="No lead source data." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <LegendDot color="#4f46e5" label="Leads" shape="square" />
            <LegendDot color="#10b981" label="Converted" shape="square" />
            <LegendDot color="#f43f5e" label="Lost" shape="square" />
          </div>

          <div className="space-y-1">
            {sources.map((s) => (
              <div
                key={s.source}
                onMouseMove={(e) => move(e, s)}
                onMouseLeave={hide}
                className="grid cursor-pointer grid-cols-[minmax(76px,112px)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
              >
                <span className="truncate text-xs font-medium text-slate-700" title={s.source}>
                  {s.source}
                </span>
                <div className="space-y-[3px]">
                  {[
                    { v: s.leads, c: 'bg-indigo-600' },
                    { v: s.converted, c: 'bg-emerald-500' },
                    { v: s.lost, c: 'bg-rose-500' },
                  ].map((b, i) => (
                    <div key={i} className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${b.c} transition-all duration-300`} style={{ width: w(b.v) }} />
                    </div>
                  ))}
                </div>
                <div className="w-[68px] text-right">
                  <div className="text-xs font-semibold tabular-nums text-slate-900">
                    {s.conversion_rate !== null ? `${s.conversion_rate}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] font-semibold tabular-nums">
                    <span className="text-indigo-600">{s.leads}</span>
                    <span className="text-slate-300"> · </span>
                    <span className="text-emerald-600">{s.converted}</span>
                    <span className="text-slate-300"> · </span>
                    <span className="text-rose-500">{s.lost}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
};
