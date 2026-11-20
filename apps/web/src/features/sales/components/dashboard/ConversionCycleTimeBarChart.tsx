import React from 'react';
import { Clock } from 'lucide-react';
import { US08LeadConversionCycleTime } from '../../types/sales-dashboard.types';
import { Badge, ChartCard, ChartTooltip, EmptyState, Segmented, TipRow, TipTitle, useChartTooltip } from './ChartShell';

interface ConversionCycleTimeBarChartProps {
  data?: US08LeadConversionCycleTime;
  compareBy: 'source' | 'owner';
  onCompareByChange: (c: 'source' | 'owner') => void;
}

type Group = US08LeadConversionCycleTime['groups'][number];

export const ConversionCycleTimeBarChart: React.FC<ConversionCycleTimeBarChartProps> = ({
  data,
  compareBy,
  onCompareByChange,
}) => {
  const { ref, tip, move, hide } = useChartTooltip<Group>();
  const groups = data?.groups || [];
  const maxDays = Math.max(...groups.map((g) => g.average_days), 10);

  return (
    <ChartCard
      cardRef={ref}
      icon={Clock}
      tone="sky"
      title="Lead Conversion Cycle Time"
      badge={
        <Badge>
          Avg {data?.overall_average_days || 0}d · Med {data?.overall_median_days || 0}d
        </Badge>
      }
      subtitle="Days taken to convert from Date Added to Won On"
      info="Horizontal bar chart showing average conversion cycle time in whole calendar days (Won on - Date Added). Fastest groups appear first."
      actions={
        <Segmented
          value={compareBy}
          onChange={onCompareByChange}
          options={[
            { id: 'source', label: 'Source' },
            { id: 'owner', label: 'Owner' },
          ]}
        />
      }
      footer={`Fastest converting ${compareBy === 'source' ? 'sources' : 'owners'} appear at top`}
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && (
            <>
              <TipTitle>{tip.data.name}</TipTitle>
              <TipRow color="#0ea5e9" label="Average" value={`${tip.data.average_days} days`} />
              <TipRow label="Median" value={`${tip.data.median_days} days`} />
              <TipRow label="Fastest" value={`${tip.data.min_days} days`} />
              <TipRow label="Slowest" value={`${tip.data.max_days} days`} />
              <TipRow label="Leads won" value={tip.data.converted_count} />
            </>
          )}
        </ChartTooltip>
      }
    >
      {groups.length === 0 ? (
        <EmptyState text="No converted leads in this period." />
      ) : (
        <div className="space-y-1">
          {groups.map((g) => (
            <div
              key={g.name}
              onMouseMove={(e) => move(e, g)}
              onMouseLeave={hide}
              className="group cursor-pointer rounded-lg px-2 py-2 transition hover:bg-slate-50"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-slate-700" title={g.name}>
                  {g.name} <span className="text-[10px] font-normal text-slate-400">(n={g.converted_count})</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{g.average_days} days</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300 group-hover:from-sky-600 group-hover:to-sky-500"
                  style={{ width: `${Math.max((g.average_days / maxDays) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
};
