import React from 'react';
import { TrendingUp, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { US03NewLeadsAddedTrend } from '../../types/sales-dashboard.types';
import { Badge, ChartCard, ChartTooltip, EmptyState, Segmented, TipRow, TipTitle, TrendSvg, useChartTooltip } from './ChartShell';

interface NewLeadsTrendAreaChartProps {
  data?: US03NewLeadsAddedTrend;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (g: 'day' | 'week' | 'month') => void;
}

export const NewLeadsTrendAreaChart: React.FC<NewLeadsTrendAreaChartProps> = ({ data, groupBy, onGroupByChange }) => {
  const { ref, tip, move, hide } = useChartTooltip<number>();
  const periods = data?.periods || [];
  const trendTag = data?.trend_tag;
  const hoverIndex = tip ? tip.data : null;
  const tone = trendTag?.color === 'green' ? 'green' : trendTag?.color === 'red' ? 'red' : 'slate';

  return (
    <ChartCard
      cardRef={ref}
      icon={TrendingUp}
      tone="blue"
      title="New Leads Added Trend"
      badge={
        trendTag && (
          <Badge tone={tone}>
            {trendTag.arrow === 'up' && <ArrowUp className="h-3 w-3" />}
            {trendTag.arrow === 'down' && <ArrowDown className="h-3 w-3" />}
            {trendTag.arrow === 'horizontal' && <ArrowRight className="h-3 w-3" />}
            {trendTag.category} {trendTag.is_new ? '(New)' : `${trendTag.percentage}%`}
          </Badge>
        )
      }
      subtitle="Lead generation rate vs previous equivalent period"
      info="Area chart showing new leads created over time. The trend tag displays percentage change vs the prior equivalent period (±5% is steady)."
      actions={
        <Segmented
          value={groupBy}
          onChange={onGroupByChange}
          options={[
            { id: 'day', label: 'Day' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
          ]}
        />
      }
      footer={`Periods with 0 leads are plotted as 0. Grouping: ${groupBy.toUpperCase()}`}
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && periods[tip.data] && (
            <>
              <TipTitle>{periods[tip.data].period}</TipTitle>
              <TipRow color="#2563eb" label="New leads" value={periods[tip.data].count} />
            </>
          )}
        </ChartTooltip>
      }
    >
      {periods.length === 0 ? (
        <EmptyState text="No leads found for the selected filters." />
      ) : (
        <TrendSvg
          labels={periods.map((p) => p.period)}
          series={[{ key: 'leads', color: '#2563eb', values: periods.map((p) => p.count), area: true }]}
          hoverIndex={hoverIndex}
          onHover={(i, e) => move(e, i)}
          alwaysShowMarkers
        />
      )}
    </ChartCard>
  );
};
