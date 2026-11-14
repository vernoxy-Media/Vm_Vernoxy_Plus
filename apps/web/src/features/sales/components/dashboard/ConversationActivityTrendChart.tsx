import React from 'react';
import { MessageSquare } from 'lucide-react';
import { US09ConversationActivityTrend } from '../../types/sales-dashboard.types';
import {
  Badge,
  ChartCard,
  ChartTooltip,
  EmptyState,
  LegendDot,
  Segmented,
  TipRow,
  TipTitle,
  TrendSvg,
  useChartTooltip,
} from './ChartShell';

interface ConversationActivityTrendChartProps {
  data?: US09ConversationActivityTrend;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (g: 'day' | 'week' | 'month') => void;
}

const LINE_CONFIG = [
  { key: 'call', label: 'Call', color: '#2563eb' },
  { key: 'email', label: 'Email', color: '#10b981' },
  { key: 'whatsapp', label: 'WhatsApp', color: '#f59e0b' },
  { key: 'meeting', label: 'Meeting', color: '#8b5cf6' },
  { key: 'site_visit', label: 'Site Visit', color: '#ec4899' },
] as const;

export const ConversationActivityTrendChart: React.FC<ConversationActivityTrendChartProps> = ({
  data,
  groupBy,
  onGroupByChange,
}) => {
  const { ref, tip, move, hide } = useChartTooltip<number>();
  const periods = data?.periods || [];
  const peak = data?.peak_period;
  const hoverIndex = tip ? tip.data : null;

  return (
    <ChartCard
      cardRef={ref}
      icon={MessageSquare}
      tone="blue"
      title="Conversation Activity Trend"
      badge={peak && <Badge tone="blue">Peak: {peak}</Badge>}
      subtitle="Outreach volume across 5 conversation types"
      info="Multi-series line chart with data points for Call, Email, WhatsApp, Meeting and Site Visit. Includes peak marker for busiest period."
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
      footer="Completed follow-ups are recorded and counted as conversations"
      onLeave={hide}
      tooltip={
        <ChartTooltip tip={tip}>
          {tip && periods[tip.data] && (
            <>
              <TipTitle>{periods[tip.data].period}</TipTitle>
              {LINE_CONFIG.map((c) => (
                <TipRow key={c.key} color={c.color} label={c.label} value={(periods[tip.data] as any)[c.key] ?? 0} />
              ))}
              <div className="mt-1 border-t border-white/10 pt-1">
                <TipRow label="Total" value={periods[tip.data].total} />
              </div>
            </>
          )}
        </ChartTooltip>
      }
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {LINE_CONFIG.map((c) => (
          <LegendDot key={c.key} color={c.color} label={c.label} />
        ))}
      </div>
      {periods.length === 0 ? (
        <EmptyState text="No conversation activity in this period." />
      ) : (
        <TrendSvg
          labels={periods.map((p) => p.period)}
          series={LINE_CONFIG.map((c) => ({
            key: c.key,
            color: c.color,
            values: periods.map((p) => (p as any)[c.key] || 0),
          }))}
          hoverIndex={hoverIndex}
          onHover={(i, e) => move(e, i)}
        />
      )}
    </ChartCard>
  );
};
