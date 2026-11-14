import React from 'react';
import { IndianRupee } from 'lucide-react';
import { US10RevenueGenerated } from '../../types/sales-dashboard.types';
import { Badge, BarGuides, ChartCard, ChartTooltip, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface RevenueWaterfallChartProps {
  data?: US10RevenueGenerated;
}

interface Bar {
  month: string;
  revenue_inr: number;
  revenue_lakh: number;
  running_total_lakh: number;
  converted_count: number;
}

export const RevenueWaterfallChart: React.FC<RevenueWaterfallChartProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Bar>();
  const months = data?.months || [];
  const totalLakh = data?.total_revenue_lakh || 0;
  const totalInr = data?.total_revenue_inr || 0;
  const withoutRev = data?.converted_leads_without_revenue || 0;
  const maxLakh = Math.max(totalLakh, 10);

  const totalBar: Bar = {
    month: 'Total',
    revenue_inr: totalInr,
    revenue_lakh: totalLakh,
    running_total_lakh: totalLakh,
    converted_count: months.reduce((a, b) => a + b.converted_count, 0),
  };

  const cols: { bar: Bar; isTotal: boolean }[] = [
    ...months.map((m) => ({ bar: m as Bar, isTotal: false })),
    { bar: totalBar, isTotal: true },
  ];

  return (
    <ChartCard
      cardRef={ref}
      icon={IndianRupee}
      tone="blue"
      title="Revenue Generated"
      badge={<Badge tone="blue">₹{totalLakh} L</Badge>}
      subtitle="Monthly revenue contribution and cumulative total"
      info="Waterfall chart displaying how each month adds to overall revenue. Each monthly step floats on the running total, ending with a green Total column."
      footer="Amounts in ₹ Lakh (L). Hover for full monetary values"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.month}</TipTitle>
              <TipRow color="#2563eb" label="Revenue" value={`₹${tip.data.revenue_inr.toLocaleString('en-IN')}`} />
              <TipRow label="In lakh" value={`${tip.data.revenue_lakh} L`} />
              <TipRow label="Running total" value={`₹${tip.data.running_total_lakh} L`} />
              <TipRow label="Leads won" value={tip.data.converted_count} />
            </>
          )}
        </ChartTooltip>
      }
    >
      <div className="relative h-48 pt-3">
        <div className="relative h-full">
          <BarGuides />
          <div className="relative flex h-full items-stretch justify-between gap-1.5 sm:gap-2.5">
            {cols.map(({ bar, isTotal }) => {
              const bottom = isTotal ? 0 : Math.max(((bar.running_total_lakh - bar.revenue_lakh) / maxLakh) * 100, 0);
              const height = Math.max((bar.revenue_lakh / maxLakh) * 100, 3);
              const active = tip?.data.month === bar.month;
              return (
                <div
                  key={bar.month}
                  className="relative flex-1 cursor-pointer"
                  onMouseMove={(e) => move(e, bar)}
                  onMouseLeave={hide}
                >
                  <div
                    className={`absolute inset-x-0 mx-auto w-full max-w-[32px] rounded-md transition-all duration-200 ${
                      isTotal
                        ? active
                          ? 'bg-emerald-600'
                          : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : active
                          ? 'bg-blue-700'
                          : 'bg-gradient-to-t from-blue-600 to-blue-400'
                    }`}
                    style={{ bottom: `${bottom}%`, height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-1.5 sm:gap-2.5">
          {cols.map(({ bar, isTotal }) => (
            <span
              key={bar.month}
              className={`flex-1 truncate text-center text-[11px] font-medium ${isTotal ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}
            >
              {isTotal ? 'Total' : bar.month.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {withoutRev > 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-center text-[11px] text-amber-700">
          {withoutRev} converted leads have no revenue amount recorded (counted as ₹0).
        </div>
      )}
    </ChartCard>
  );
};
