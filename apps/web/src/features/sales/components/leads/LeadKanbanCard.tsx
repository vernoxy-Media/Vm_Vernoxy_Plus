import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Calendar, CheckCircle2, Eye, Megaphone, MessageSquarePlus, PauseCircle, RotateCcw, User, XCircle, ExternalLink } from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '../common/ActionMenu';
import { formatDateIST } from '../../utils/date';
import type { FollowUpFlag, LeadListItem, LeadStatusType } from '../../types/sales.types';

export type LeadCardAction = 'open' | 'log' | 'qualify' | 'hold' | 'lost' | 'reopen' | 'won';

export interface LeadKanbanCardProps {
  lead: LeadListItem;
  selected?: boolean;
  /** Statuses this card can be moved to from the small-screen "Move to" menu. */
  moveTargets?: LeadStatusType[];
  onMove?: (lead: LeadListItem, target: LeadStatusType) => void;
  /** "View" and a click on the card open the side panel. */
  onView?: (lead: LeadListItem) => void;
  onAction?: (lead: LeadListItem, action: LeadCardAction) => void;
  /** Rendered inside the drag overlay: no drag handlers, slightly tilted. */
  overlay?: boolean;
}

const FOLLOW_UP_TEXT: Record<FollowUpFlag, { dot: string; text: string }> = {
  overdue: { dot: 'bg-rose-500', text: 'text-rose-600' },
  today: { dot: 'bg-amber-500', text: 'text-amber-600' },
  upcoming: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
};

/** "26 Sep" in IST, short enough for a card. */
const shortDay = (iso: string) => formatDateIST(iso).replace(/\s\d{4}$/, '');

export const LeadKanbanCard: React.FC<LeadKanbanCardProps> = ({ lead, selected = false, moveTargets = [], onMove, onView, onAction, overlay = false }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lead-${lead.lead_id}`, data: { lead }, disabled: overlay });

  const companyName = lead.company?.name ?? 'Lead';
  const flag = lead.next_follow_up?.flag;
  const fu = flag ? FOLLOW_UP_TEXT[flag] : null;

  const canQualify = lead.status === 'Contacted';
  const canHold = lead.status === 'Contacted' || lead.status === 'Qualified';
  const canLose = lead.status === 'New' || lead.status === 'Contacted' || lead.status === 'Qualified';
  const canReopen = lead.status === 'Lost' || lead.status === 'On Hold';

  const menu: ActionMenuItem[] = onAction
    ? [
        { key: 'open', label: 'Open full page', icon: ExternalLink, onSelect: () => onAction(lead, 'open') },
        ...(lead.status !== 'Converted' ? [{ key: 'log', label: 'Log conversation', icon: MessageSquarePlus, onSelect: () => onAction(lead, 'log') }] : []),
        ...(canQualify ? [{ key: 'qualify', label: 'Mark as Qualified', icon: CheckCircle2, onSelect: () => onAction(lead, 'qualify') }] : []),
        ...(canReopen ? [{ key: 'reopen', label: 'Reopen', icon: RotateCcw, onSelect: () => onAction(lead, 'reopen') }] : []),
        ...(canHold ? [{ key: 'hold', label: 'Put on hold', icon: PauseCircle, onSelect: () => onAction(lead, 'hold') }] : []),
        ...(canLose ? [{ key: 'lost', label: 'Mark as lost', icon: XCircle, onSelect: () => onAction(lead, 'lost'), danger: true }] : []),
      ]
    : [];

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => onView?.(lead)}
      className={`group relative select-none rounded-xl border bg-white p-3 transition-all ${
        overlay
          ? 'rotate-2 scale-[1.03] cursor-grabbing border-primary/40 shadow-2xl ring-2 ring-primary/30'
          : isDragging
            ? 'border-dashed border-gray-300 opacity-30 shadow-none'
            : selected
              ? 'cursor-pointer border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'cursor-pointer border-gray-200 shadow-2xs hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Lead ID */}
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-gray-600">
          {lead.lead_code || `LEAD-${lead.lead_id}`}
        </span>
        {lead.service_fit && lead.service_fit.length > 0 && (
          <span className="max-w-[9rem] truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary" title={lead.service_fit.join(', ')}>
            {lead.service_fit[0]}
            {lead.service_fit.length > 1 && ` +${lead.service_fit.length - 1}`}
          </span>
        )}
      </div>

      {/* Company */}
      <h4 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900" title={companyName}>
        {companyName}
      </h4>

      {/* Contact and owner */}
      <div className="mt-2 space-y-1.5 text-[12.5px] text-gray-600">
        <div className="flex items-center gap-2 truncate">
          <User className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span className="truncate">{lead.contact_person || 'No contact yet'}</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-teal-500" />
          <span className="truncate">Lead by: {lead.lead_by?.name ?? 'Unassigned'}</span>
        </div>
      </div>

      {/* Dates */}
      <div className="mt-3 space-y-1.5 border-t border-dashed border-gray-200 pt-2.5 text-[11.5px] text-gray-500">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span>Added: {formatDateIST(lead.date_added)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`ml-0.5 h-2 w-2 shrink-0 rounded-full ${fu ? fu.dot : 'bg-rose-400'}`} />
          <span className={fu ? `font-semibold ${fu.text}` : ''}>
            Follow-up: {lead.next_follow_up ? `${flag === 'overdue' ? 'Overdue · ' : flag === 'today' ? 'Today · ' : 'Due '}${shortDay(lead.next_follow_up.at)}` : 'None'}
          </span>
        </div>
      </div>

      {/* View and more */}
      <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onView?.(lead)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-primary transition hover:bg-primary/10"
        >
          <Eye className="h-4 w-4" />
          View
        </button>

        <div className="flex items-center gap-1">
          {onMove && moveTargets.length > 0 && (
            <select
              aria-label="Move lead to another status"
              value=""
              onChange={(e) => e.target.value && onMove(lead, e.target.value as LeadStatusType)}
              className="h-8 rounded-lg border border-gray-200 bg-white px-1.5 text-[11px] font-medium text-gray-600 focus:outline-hidden focus:ring-2 focus:ring-primary/20 md:hidden"
            >
              <option value="">Move to…</option>
              {moveTargets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {menu.length > 0 && <ActionMenu items={menu} label={`More actions for ${companyName}`} />}
        </div>
      </div>
    </div>
  );
};
