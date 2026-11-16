import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { US11SalesProfitability } from '../../types/sales-dashboard.types';
import { Badge, BarGuides, ChartCard, ChartTooltip, LegendDot, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface SalesProfitabilityComboChartProps {
  data?: US11SalesProfitability;
}

type Month = US11SalesProfitability['months'][number];

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const SalesProfitabilityComboChart: React.FC<SalesProfitabilityComboChartProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Month>();
  const months = data?.months || [];
  const totalProfit = data?.total_profit_inr || 0;
  const margin = data?.overall_profit_margin_pct;
  const excluded = data?.excluded_leads_count || 0;
  const maxLakh = Math.max(...months.map((m) => Math.max(m.revenue_lakh, m.cost_lakh)), 10);

  return (
    <ChartCard
      cardRef={ref}
      icon={TrendingUp}
      tone="indigo"
      title="Sales Profitability"
      badge={
        <Badge tone={totalProfit >= 0 ? 'green' : 'red'}>
          Profit ₹{(totalProfit / 100000).toFixed(2)} L ({margin !== null && margin !== undefined ? `${margin}%` : 'N/A'})
        </Badge>
      }
      subtitle="Revenue, cost and profit margin % across months"
      info="Combo chart comparing Revenue (indigo columns) and Cost (amber columns) against Profit Margin %. Converted leads with missing cost are excluded."
      footer="Negative margins indicate operating losses (shown in red)"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.month}</TipTitle>
              <TipRow color="#4f46e5" label="Revenue" value={inr(tip.data.revenue_inr)} />
              <TipRow color="#f59e0b" label="Cost" value={inr(tip.data.cost_inr)} />
              <TipRow
                label="Profit"
                value={<span className={tip.data.profit_inr >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{inr(tip.data.profit_inr)}</span>}
              />
              <TipRow
                label="Margin"
                value={tip.data.profit_margin_pct !== null ? `${tip.data.profit_margin_pct}%` : 'N/A'}
              />
            </>
          )}
        </ChartTooltip>
      }
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <LegendDot color="#4f46e5" label="Revenue (₹ L)" shape="square" />
        <LegendDot color="#f59e0b" label="Cost (₹ L)" shape="square" />
        <LegendDot color="#10b981" label="Profit margin %" shape="line" />
      </div>

      <div className="relative h-48 pt-6">
        <div className="relative h-full">
          <BarGuides />
          <div className="relative flex h-full items-end justify-between gap-2 sm:gap-4">
            {months.map((m) => {
              const rev = Math.max((m.revenue_lakh / maxLakh) * 100, 2);
              const cost = Math.max((m.cost_lakh / maxLakh) * 100, 2);
              const active = tip?.data.month === m.month;
              return (
                <div
                  key={m.month}
                  className="relative flex h-full flex-1 cursor-pointer items-end justify-center gap-1"
                  onMouseMove={(e) => move(e, m)}
                  onMouseLeave={hide}
                >
                  {m.profit_margin_pct !== null && (
                    <span
                      className={`absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[10px] font-bold ${
                        m.profit_margin_pct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {m.profit_margin_pct}%
                    </span>
                  )}
                  <div
                    className={`w-1/2 max-w-[22px] rounded-t-md transition-all duration-200 ${active ? 'bg-indigo-700' : 'bg-gradient-to-t from-indigo-600 to-indigo-400'}`}
                    style={{ height: `${rev}%` }}
                  />
                  <div
                    className={`w-1/2 max-w-[22px] rounded-t-md transition-all duration-200 ${active ? 'bg-amber-600' : 'bg-gradient-to-t from-amber-500 to-amber-300'}`}
                    style={{ height: `${cost}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-2 sm:gap-4">
          {months.map((m) => (
            <span key={m.month} className="flex-1 truncate text-center text-[11px] font-medium text-slate-500">
              {m.month.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {excluded > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{excluded} converted leads excluded because product/production cost is missing.</span>
        </div>
      )}
    </ChartCard>
  );
};
