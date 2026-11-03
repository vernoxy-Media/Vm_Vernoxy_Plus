import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanCard, type LeadCardAction } from './LeadKanbanCard';
import type { BoardColumn, LeadListItem, LeadStatusType } from '../../types/sales.types';

export interface LeadKanbanBoardProps {
  columns: BoardColumn[];
  /** Show only this status (the status tab chosen above the board). */
  onlyStatus?: LeadStatusType | null;
  onMoveLead: (lead: LeadListItem, targetStatus: LeadStatusType) => void;
  selectedLeadId?: number | null;
  onView?: (lead: LeadListItem) => void;
  onAction?: (lead: LeadListItem, action: LeadCardAction) => void;
  /** Phones: one column at a time. */
  single?: boolean;
  canLoadMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const LOOK: Record<LeadStatusType, { title: string; dot: string; accent: string; tint: string }> = {
  New: { title: 'New', dot: 'bg-blue-500', accent: 'border-blue-400', tint: 'bg-blue-50/50' },
  Contacted: { title: 'Contacted', dot: 'bg-violet-500', accent: 'border-violet-400', tint: 'bg-violet-50/50' },
  Qualified: { title: 'Qualified', dot: 'bg-emerald-500', accent: 'border-emerald-400', tint: 'bg-emerald-50/50' },
  'On Hold': { title: 'On Hold', dot: 'bg-amber-500', accent: 'border-amber-400', tint: 'bg-amber-50/50' },
  Converted: { title: 'Won · Client', dot: 'bg-teal-500', accent: 'border-teal-400', tint: 'bg-teal-50/50' },
  Lost: { title: 'Lost', dot: 'bg-slate-500', accent: 'border-slate-400', tint: 'bg-slate-100/60' },
};
const ORDER: LeadStatusType[] = ['New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost'];

export const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({ columns, onlyStatus, onMoveLead, selectedLeadId = null, onView, onAction, single = false, canLoadMore = false, loadingMore = false, onLoadMore }) => {
  const [dragging, setDragging] = React.useState<LeadListItem | null>(null);

  // Mouse needs a small drag distance so clicks on links still work; touch needs a short press so the board can still scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const byStatus = React.useMemo(() => new Map(columns.map((c) => [c.status, c])), [columns]);
  const shown = ORDER.filter((s) => !onlyStatus || s === onlyStatus);

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.lead as LeadListItem) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    const lead = e.active.data.current?.lead as LeadListItem | undefined;
    setDragging(null);
    if (!e.over || !lead) return;
    const target = e.over.id as LeadStatusType;
    if (target !== lead.status) onMoveLead(lead, target);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className={`flex h-full min-h-0 gap-3 px-0.5 pb-1 ${single ? '' : 'snap-x snap-mandatory overflow-x-auto'}`}>
        {shown.map((status) => {
          const col = byStatus.get(status);
          const look = LOOK[status];
          return (
            <LeadKanbanColumn
              key={status}
              status={status}
              title={look.title}
              count={col?.count ?? 0}
              leads={col?.cards ?? []}
              dot={look.dot}
              accent={look.accent}
              tint={look.tint}
              dimmed={dragging !== null && dragging.status === status}
              allStatuses={ORDER}
              onMove={onMoveLead}
              selectedLeadId={selectedLeadId}
              onView={onView}
              onAction={onAction}
              single={single}
              canLoadMore={canLoadMore}
              loadingMore={loadingMore}
              onLoadMore={onLoadMore}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {dragging ? (
          <div className="w-72 sm:w-[19rem]">
            <LeadKanbanCard lead={dragging} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
