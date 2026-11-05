import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Ban, Building2, CalendarClock, CheckCircle2, Mail, MapPin, MessageSquare, Phone, RotateCcw, User, Users, XCircle } from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '../common/ActionMenu';
import { FollowUpFlagBadge } from '../common/FollowUpFlagBadge';
import { formatDateTimeIST } from '../../utils/date';
import { getAvatarColor, getInitials } from '../../utils/formatters';
import type { FollowUpItem, SalesFollowUpItem } from '../../types/sales.types';

export interface FollowUpRowProps {
  item: FollowUpItem;
  isSelected: boolean;
  /** "table" renders the <tr> for the desktop table, "card" the stacked card for small screens. */
  variant?: 'table' | 'card';
  onToggleSelect: (id: number) => void;
  onComplete: (item: SalesFollowUpItem) => void;
  onReschedule: (item: SalesFollowUpItem) => void;
  onCancel: (item: SalesFollowUpItem) => void;
}

const CHANNELS: Record<string, { Icon: typeof Phone; tile: string }> = {
  call: { Icon: Phone, tile: 'bg-blue-50 text-blue-600' },
  email: { Icon: Mail, tile: 'bg-violet-50 text-violet-600' },
  whatsapp: { Icon: MessageSquare, tile: 'bg-emerald-50 text-emerald-600' },
  meeting: { Icon: Users, tile: 'bg-amber-50 text-amber-600' },
  'site visit': { Icon: MapPin, tile: 'bg-rose-50 text-rose-600' },
};

export const FollowUpRow: React.FC<FollowUpRowProps> = ({ variant = 'table', item, isSelected, onToggleSelect, onComplete, onReschedule, onCancel }) => {
  const navigate = useNavigate();
  const companyName = item.company?.name || 'Company';
  const channel = CHANNELS[item.type?.toLowerCase()] ?? CHANNELS.call;
  const ChannelIcon = channel.Icon;

  const isPending = item.status === 'Pending' || item.status === 'Overdue';
  const isCompleted = item.status === 'Completed';
  const can = (a: FollowUpItem['actions'][number]) => isPending && item.actions.includes(a);

  const flag = (() => {
    if (!isPending) return null;
    const now = new Date();
    const target = new Date(item.follow_up_on);
    const sameDay = target.toDateString() === now.toDateString();
    if (target < now && !sameDay) return 'overdue';
    return sameDay ? 'today' : 'upcoming';
  })();

  // The flat shape the Complete / Reschedule / Cancel pop-ups use
  const forModal: SalesFollowUpItem = {
    id: item.follow_up_id,
    lead_id: item.related_to.lead_id ?? null,
    company_name: item.company?.name,
    contact_name: item.contact?.name,
    type: item.type as SalesFollowUpItem['type'],
    due_date: item.follow_up_on,
    status: item.status,
    purpose: item.purpose,
    assigned_to_name: item.assigned_to?.name,
    rescheduled_count: item.rescheduled_count,
  };

  const openTarget = item.related_to.lead_id ? `/sales/leads/${item.related_to.lead_id}` : `/sales/companies/${item.related_to.company_id}`;
  const menu: ActionMenuItem[] = [
    ...(can('complete') ? [{ key: 'complete', label: 'Complete follow-up', icon: CheckCircle2, onSelect: () => onComplete(forModal) }] : []),
    ...(can('reschedule') ? [{ key: 'reschedule', label: 'Reschedule', icon: RotateCcw, onSelect: () => onReschedule(forModal) }] : []),
    { key: 'open', label: item.related_to.lead_id ? 'Open lead' : 'Open company', icon: ArrowUpRight, onSelect: () => navigate(openTarget) },
    ...(can('cancel') ? [{ key: 'cancel', label: 'Cancel follow-up', icon: XCircle, onSelect: () => onCancel(forModal), danger: true }] : []),
  ];

  const when = isPending ? (
    <FollowUpFlagBadge flag={flag} at={item.follow_up_on} />
  ) : isCompleted ? (
    <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      <span className="leading-tight">
        <span className="block text-[11px] font-bold text-emerald-800">Completed</span>
        <span className="block text-[11px] text-emerald-600">{formatDateTimeIST(item.done_on ?? item.follow_up_on)}</span>
      </span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
      <Ban className="h-4 w-4 text-slate-400" />
      <span className="leading-tight">
        <span className="block text-[11px] font-bold text-slate-600">Cancelled</span>
        <span className="block text-[11px] text-slate-400">{formatDateTimeIST(item.follow_up_on)}</span>
      </span>
    </span>
  );

  const rescheduled = item.rescheduled_count >= 3 && (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200" title="Rescheduled several times: the Admin is told">
      <AlertTriangle className="h-3 w-3" />
      Rescheduled {item.rescheduled_count}×
    </span>
  );

  return (
    <>
      {variant === 'table' && (
        <tr className={`transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
          <td className="w-12 py-3.5 pl-5 pr-2">
            <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(item.follow_up_id)} aria-label={`Select follow-up with ${companyName}`} className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          </td>

          {/* What is to be done */}
          <td className="px-3 py-3.5">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${channel.tile}`}>
                <ChannelIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{item.type}</p>
                <p className="max-w-[13rem] truncate text-xs text-slate-500" title={item.purpose ?? undefined}>
                  {item.purpose || 'No purpose noted'}
                </p>
              </div>
            </div>
          </td>

          {/* With whom */}
          <td className="px-3 py-3.5">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${getAvatarColor(companyName)}`}>{getInitials(companyName)}</span>
              <div className="min-w-0">
                <Link to={`/sales/companies/${item.related_to.company_id}`} className="block max-w-[13rem] truncate text-sm font-semibold text-slate-900 hover:text-blue-600" title={companyName}>
                  {companyName}
                </Link>
                {item.related_to.lead_id ? (
                  <Link to={`/sales/leads/${item.related_to.lead_id}`} className="font-mono text-[11px] font-semibold text-blue-600 hover:underline">
                    {item.related_to.lead_code ?? `LEAD-${item.related_to.lead_id}`}
                  </Link>
                ) : (
                  <span className="font-mono text-[11px] text-slate-400">{item.related_to.company_code ?? 'Company'}</span>
                )}
              </div>
            </div>
          </td>

          <td className="px-3 py-3.5 text-sm text-slate-700">
            {item.contact?.name ? (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="max-w-[9rem] truncate" title={item.contact.name}>
                  {item.contact.name}
                </span>
              </span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </td>

          <td className="px-3 py-3.5">
            <div className="flex flex-col items-start gap-1.5">
              {when}
              {rescheduled}
            </div>
          </td>

          <td className="px-3 py-3.5">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${getAvatarColor(item.assigned_to?.name || 'x')}`}>{getInitials(item.assigned_to?.name || '?')}</span>
              <span className="max-w-[8rem] truncate text-sm text-slate-700" title={item.assigned_to?.name}>
                {item.assigned_to?.name}
              </span>
            </div>
          </td>

          <td className="py-3.5 pl-3 pr-4">
            <div className="flex items-center justify-end">
              <ActionMenu items={menu} label={`Actions for the follow-up with ${companyName}`} />
            </div>
          </td>
        </tr>
      )}

      {variant === 'card' && (
        <div className={`overflow-hidden rounded-2xl border bg-white transition-all ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200/80 shadow-2xs'}`}>
          <div className="flex items-start gap-3 p-4 pb-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${channel.tile}`}>
              <ChannelIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-slate-900">{item.type}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{item.purpose || 'No purpose noted'}</p>
            </div>
            <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(item.follow_up_id)} aria-label={`Select follow-up with ${companyName}`} className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
          </div>

          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {when}
              {rescheduled}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Company</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-800">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{companyName}</span>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Lead</dt>
                <dd className="mt-0.5 truncate font-mono font-semibold text-blue-600">
                  {item.related_to.lead_id ? (
                    <Link to={`/sales/leads/${item.related_to.lead_id}`}>{item.related_to.lead_code ?? `LEAD-${item.related_to.lead_id}`}</Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Contact</dt>
                <dd className="mt-0.5 truncate font-medium text-slate-800">{item.contact?.name || '—'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-slate-400">Assigned to</dt>
                <dd className="mt-0.5 truncate font-medium text-slate-800">{item.assigned_to?.name || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
            {can('complete') ? (
              <button type="button" onClick={() => onComplete(forModal)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.99]">
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </button>
            ) : (
              <Link to={openTarget} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                {item.related_to.lead_id ? 'Open lead' : 'Open company'}
              </Link>
            )}
            <ActionMenu items={menu} label={`Actions for the follow-up with ${companyName}`} />
          </div>
        </div>
      )}
    </>
  );
};
