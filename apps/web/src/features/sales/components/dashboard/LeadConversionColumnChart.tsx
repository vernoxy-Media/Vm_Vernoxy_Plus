import React from 'react';
import { BarChart2 } from 'lucide-react';
import { US04LeadToClientConversionTrend } from '../../types/sales-dashboard.types';
import { Badge, BarGuides, ChartCard, ChartTooltip, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface LeadConversionColumnChartProps {
  data?: US04LeadToClientConversionTrend;
}

type Month = US04LeadToClientConversionTrend['months'][number];

export const LeadConversionColumnChart: React.FC<LeadConversionColumnChartProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Month>();
  const months = data?.months || [];
  const totalConverted = data?.total_converted || 0;
  const maxVal = Math.max(...months.map((m) => m.count), 5);

  return (
    <ChartCard
      cardRef={ref}
      icon={BarChart2}
      tone="emerald"
      title="Lead-to-Client Conversion Trend"
      badge={<Badge tone="green">Total: {totalConverted}</Badge>}
      subtitle="Monthly converted clients based on Won On date"
      info="Vertical column chart showing client acquisition output by month. Counts each converted lead once in the month of its Won On date."
      footer="Shows last 6 months client conversions"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.month}</TipTitle>
              <TipRow color="#10b981" label="Clients won" value={tip.data.count} />
              {tip.data.change_from_prev !== undefined && (
                <TipRow
                  label="vs previous month"
                  value={
                    <span className={tip.data.change_from_prev >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {tip.data.change_from_prev >= 0 ? `+${tip.data.change_from_prev}` : tip.data.change_from_prev}
                    </span>
                  }
                />
              )}
            </>
          )}
        </ChartTooltip>
      }
    >
      <div className="relative h-48 pt-5">
        <div className="relative h-full">
          <BarGuides />
          <div className="relative flex h-full items-end justify-between gap-2 sm:gap-3">
            {months.map((m) => {
              const pct = Math.max((m.count / maxVal) * 100, m.count > 0 ? 4 : 2);
              const active = tip?.data.month === m.month;
              return (
                <div
                  key={m.month}
                  className="flex h-full flex-1 cursor-pointer flex-col justify-end"
                  onMouseMove={(e) => move(e, m)}
                  onMouseLeave={hide}
                >
                  <div className="relative mx-auto flex w-full max-w-[36px] flex-col justify-end" style={{ height: `${pct}%` }}>
                    <span className="absolute bottom-full mb-1 w-full text-center text-[11px] font-semibold tabular-nums text-slate-700">
                      {m.count}
                    </span>
                    <div
                      className={`h-full w-full rounded-t-lg transition-all duration-200 ${
                        active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-2 sm:gap-3">
          {months.map((m) => (
            <span key={m.month} className="flex-1 truncate text-center text-[11px] font-medium text-slate-500">
              {m.month.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>
    </ChartCard>
  );
};
