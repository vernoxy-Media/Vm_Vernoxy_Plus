import React from 'react';
import { GitCommit } from 'lucide-react';
import { US06ServiceFitDemand } from '../../types/sales-dashboard.types';
import { ChartCard, ChartTooltip, EmptyState, LegendDot, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface ServiceFitDemandDumbbellChartProps {
  data?: US06ServiceFitDemand;
}

type Service = US06ServiceFitDemand['services'][number];

export const ServiceFitDemandDumbbellChart: React.FC<ServiceFitDemandDumbbellChartProps> = ({ data }) => {
  const { ref, tip, move, hide } = useChartTooltip<Service>();
  const services = data?.services || [];
  const maxLeads = Math.max(...services.map((s) => s.leads), 1);

  return (
    <ChartCard
      cardRef={ref}
      icon={GitCommit}
      tone="violet"
      title="Service Fit Demand"
      subtitle="Interest vs conversion gap across services"
      info="Dumbbell chart showing the gap between interest (indigo dot) and conversions (green dot). If a lead has multiple services, it is counted under each."
      footer="The longer the line between dots, the larger the conversion gap"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.service}</TipTitle>
              <TipRow color="#4f46e5" label="Leads (demand)" value={tip.data.leads} />
              <TipRow color="#10b981" label="Converted" value={tip.data.converted} />
              <TipRow
                label="Conversion"
                value={tip.data.conversion_rate !== null ? `${tip.data.conversion_rate}%` : 'N/A'}
              />
            </>
          )}
        </ChartTooltip>
      }
    >
      {services.length === 0 ? (
        <EmptyState text="No service demand data." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <LegendDot color="#4f46e5" label="Leads (Demand)" />
            <LegendDot color="#10b981" label="Converted" />
          </div>

          <div className="space-y-1">
            {services.map((s) => {
              const leadPos = (s.leads / maxLeads) * 92 + 4;
              const convPos = (s.converted / maxLeads) * 92 + 4;
              return (
                <div
                  key={s.service}
                  onMouseMove={(e) => move(e, s)}
                  onMouseLeave={hide}
                  className="group cursor-pointer rounded-lg px-2 py-2 transition hover:bg-slate-50"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-slate-800" title={s.service}>
                      {s.service}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      <span className="font-semibold text-slate-900">{s.leads}</span> leads ·{' '}
                      <span className="font-semibold text-slate-900">{s.converted}</span> won{' '}
                      <span className="font-semibold text-emerald-600">
                        ({s.conversion_rate !== null ? `${s.conversion_rate}%` : 'N/A'})
                      </span>
                    </span>
                  </div>
                  <div className="relative flex h-5 items-center">
                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-100" />
                    <div
                      className="absolute h-1.5 rounded-full bg-slate-300 transition-all duration-300"
                      style={{ left: `${Math.min(leadPos, convPos)}%`, width: `${Math.max(Math.abs(leadPos - convPos), 1)}%` }}
                    />
                    <span
                      className="absolute -ml-2 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow transition-transform group-hover:scale-125"
                      style={{ left: `${convPos}%` }}
                    />
                    <span
                      className="absolute -ml-2 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow transition-transform group-hover:scale-125"
                      style={{ left: `${leadPos}%` }}
                    />
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
