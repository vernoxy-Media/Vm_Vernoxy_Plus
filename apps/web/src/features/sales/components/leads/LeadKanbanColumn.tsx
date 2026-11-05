import React, { useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Inbox } from 'lucide-react';
import { LeadKanbanCard, type LeadCardAction } from './LeadKanbanCard';
import type { LeadListItem, LeadStatusType } from '../../types/sales.types';

export interface LeadKanbanColumnProps {
  status: LeadStatusType;
  title: string;
  /** Leads in this status in total (the column may show only the first cards). */
  count: number;
  leads: LeadListItem[];
  dot: string;
  accent: string;
  tint: string;
  /** True while a card is being dragged and this column cannot take it. */
  dimmed: boolean;
  allStatuses: LeadStatusType[];
  onMove: (lead: LeadListItem, target: LeadStatusType) => void;
  selectedLeadId?: number | null;
  onView?: (lead: LeadListItem) => void;
  onAction?: (lead: LeadListItem, action: LeadCardAction) => void;
  /** One column fills the screen (phones). */
  single?: boolean;
  /** More cards can be fetched for this column. */
  canLoadMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export const LeadKanbanColumn: React.FC<LeadKanbanColumnProps> = ({ status, title, count, leads, dot, accent, tint, dimmed, allStatuses, onMove, selectedLeadId = null, onView, onAction, single = false, canLoadMore = false, loadingMore = false, onLoadMore }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });

  // Fetch the next cards when the bottom of the column comes into view.
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canLoadMore || !onLoadMore || !bottom.current) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onLoadMore(), { rootMargin: '120px' });
    io.observe(bottom.current);
    return () => io.disconnect();
  }, [canLoadMore, onLoadMore, leads.length]);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${title} leads`}
      className={`flex h-full min-h-0 snap-start flex-col rounded-3xl border transition-all duration-150 ${single ? 'w-full' : 'w-[82vw] shrink-0 md:w-auto md:min-w-[16.5rem] md:max-w-[26rem] md:flex-1'} ${
        isOver ? `scale-[1.01] ${accent} bg-white shadow-xl ring-4 ring-primary/10` : `border-gray-200/70 ${tint}`
      } ${dimmed && !isOver ? 'opacity-60' : ''}`}
    >
      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <h3 className="text-[13px] font-bold tracking-tight text-gray-900">{title}</h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-700 shadow-2xs ring-1 ring-gray-200">{count}</span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-3">
        {leads.length === 0 ? (
          <div
            className={`flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors ${
              isOver ? 'border-primary/50 bg-primary/5 text-primary' : 'border-gray-200 text-gray-400'
            }`}
          >
            <Inbox className="h-5 w-5" />
            <span className="text-xs font-medium">{isOver ? `Drop to move to ${title}` : 'No leads here'}</span>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadKanbanCard
              key={lead.lead_id}
              lead={lead}
              moveTargets={allStatuses.filter((s) => s !== status)}
              onMove={onMove}
              selected={selectedLeadId === lead.lead_id}
              onView={onView}
              onAction={onAction}
            />
          ))
        )}

        {count > leads.length && (
          <div ref={bottom} className="py-2 text-center text-xs font-medium text-gray-400">
            {canLoadMore ? (loadingMore ? 'Loading more…' : 'Scroll for more') : `Showing ${leads.length} of ${count} · use the List view to see all`}
          </div>
        )}
      </div>
    </section>
  );
};
