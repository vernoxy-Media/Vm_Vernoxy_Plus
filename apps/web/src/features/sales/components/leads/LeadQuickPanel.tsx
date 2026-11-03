import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquarePlus,
  PauseCircle,
  Phone,
  RotateCcw,
  Send,
  Trophy,
  X,
  XCircle,
  Building2,
  User,
  Tag,
  History,
  Activity,
} from 'lucide-react';
import {
  useSalesActivityControllerQuickLog,
  useSalesFollowUpControllerScheduleOnLead,
  useSalesActivityControllerTimeline,
  useSalesFollowUpControllerForLead,
  useSalesLeadControllerGet,
  useSalesContactControllerList,
} from '@vernoxy-pulse/api-client';
import { Drawer } from '../common/Drawer';
import { FollowUpFlagBadge } from '../common/FollowUpFlagBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ScheduleFollowUpModal } from '../follow-ups/ScheduleFollowUpModal';
import { formatDateIST, formatDateTimeIST, istInputToIso, timeAgo, toInputDateIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import { unwrapList } from '../../utils/response';
import { getAvatarColor, getInitials } from '../../utils/formatters';
import type { FollowUpItem, SalesContactItem, LeadDetailResponse, LeadListItem, TimelineEntry } from '../../types/sales.types';
import type { LeadCardAction } from './LeadKanbanCard';

export interface LeadQuickPanelProps {
  leadId: number;
  onClose: () => void;
  onAction: (lead: LeadListItem, action: LeadCardAction) => void;
  /** Docked beside the board (large screens), or a bottom sheet / side drawer. */
  docked: boolean;
}

type Tab = 'overview' | 'details' | 'follow-ups' | 'activity';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'follow-ups', label: 'Follow-ups' },
  { id: 'activity', label: 'Activity' },
];

const KIND_ICON: Record<TimelineEntry['kind'], { Icon: typeof FileText; tone: string }> = {
  follow_up: { Icon: CalendarClock, tone: 'bg-violet-50 text-violet-600' },
  conversation: { Icon: MessageSquare, tone: 'bg-blue-50 text-blue-600' },
  note: { Icon: FileText, tone: 'bg-amber-50 text-amber-600' },
  status_change: { Icon: Activity, tone: 'bg-emerald-50 text-emerald-600' },
  event: { Icon: History, tone: 'bg-gray-100 text-gray-500' },
};

const toListItem = (d: LeadDetailResponse): LeadListItem => ({
  lead_id: d.lead_id,
  lead_code: d.lead_code,
  status: d.status,
  company: { company_id: d.company.company_id, company_code: d.company.company_code, name: d.company.name, initials: getInitials(d.company.name), city: d.company.city },
  contact_person: d.primary_contact?.name ?? null,
  lead_by: d.lead_by,
  service_fit: d.service_fit,
  lead_source: d.lead_source,
  date_added: d.date_added,
  next_follow_up: d.next_follow_up,
  no_follow_up: false,
});

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[7.5rem_1fr] items-start gap-3 py-2.5 text-sm">
    <dt className="text-gray-400">{label}</dt>
    <dd className="min-w-0 break-words font-medium text-gray-800">{children}</dd>
  </div>
);

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section>
    <div className="mb-2 flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">{icon}</span>
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </section>
);

const PanelBody: React.FC<LeadQuickPanelProps & { showHeader: boolean }> = ({ leadId, onClose, onAction, docked, showHeader }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { data: leadRaw, isLoading } = useSalesLeadControllerGet(leadId);
  const lead = ((leadRaw as unknown as { data?: LeadDetailResponse })?.data ?? (leadRaw as unknown as LeadDetailResponse | undefined)) ?? null;
  const companyId = lead?.company?.company_id ?? 0;
  const { data: contactsRaw } = useSalesContactControllerList(companyId, { query: { enabled: Boolean(companyId) && scheduleOpen } });
  const contacts = unwrapList<SalesContactItem>(contactsRaw);
  const { data: fuRaw } = useSalesFollowUpControllerForLead(leadId, { query: { enabled: tab === 'follow-ups' || tab === 'overview' } });
  const followUps = unwrapList<FollowUpItem>(fuRaw);
  const { data: tlRaw } = useSalesActivityControllerTimeline(leadId, { limit: 12 }, { query: { enabled: tab === 'overview' || tab === 'activity' } });
  const timeline = unwrapList<TimelineEntry>(tlRaw);

  if (isLoading || !lead) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const item = toListItem(lead);
  const pending = followUps.filter((f) => f.status === 'Pending' || f.status === 'Overdue');
  const location = [lead.company.city, lead.company.state].filter(Boolean).join(', ');
  const status = lead.status;

  const primary =
    status === 'Contacted'
      ? { label: 'Mark as Qualified', icon: CheckCircle2, action: 'qualify' as const, cls: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' }
      : status === 'Qualified'
        ? { label: 'Mark as Won', icon: Trophy, action: 'won' as const, cls: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20' }
        : status === 'Lost' || status === 'On Hold'
          ? { label: 'Reopen', icon: RotateCcw, action: 'reopen' as const, cls: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' }
          : status === 'New'
            ? { label: 'Log conversation', icon: MessageSquarePlus, action: 'log' as const, cls: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' }
            : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <header className="shrink-0 border-b border-gray-100 px-6 pb-0 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white ${getAvatarColor(lead.company.name)}`}>{getInitials(lead.company.name)}</span>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold leading-tight text-gray-900" title={lead.company.name}>
                    {lead.company.name}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">{lead.lead_code || `LEAD-${lead.lead_id}`}</span>
                    <StatusBadge status={lead.status} size="sm" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => navigate(`/sales/leads/${lead.lead_id}`)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
                <ExternalLink className="h-4 w-4" />
                Open
              </button>
              <button type="button" onClick={onClose} aria-label="Close panel" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <PanelTabs tab={tab} setTab={setTab} />
        </header>
      )}
      {!showHeader && (
        <div className="-mt-1 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-gray-500">{lead.lead_code || `LEAD-${lead.lead_id}`}</span>
              <StatusBadge status={lead.status} size="sm" />
            </div>
            <button type="button" onClick={() => navigate(`/sales/leads/${lead.lead_id}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              Open full page
            </button>
          </div>
          <PanelTabs tab={tab} setTab={setTab} />
        </div>
      )}

      <div className={`min-h-0 flex-1 space-y-7 ${showHeader ? 'overflow-y-auto overscroll-contain px-6 py-6' : ''}`}>
        {tab === 'overview' && (
          <>
            <Composer leadId={leadId} onContactMissing={() => navigate(`/sales/leads/${leadId}?tab=contacts`)} locked={status === 'Converted'} />

            <Section icon={<Building2 className="h-4 w-4" />} title="Overview">
              <dl className="divide-y divide-gray-100">
                <Row label="Company">{lead.company.name}</Row>
                <Row label="Contact person">{lead.primary_contact?.name ?? '—'}</Row>
                <Row label="Lead owner">{lead.lead_by?.name ?? 'Unassigned'}</Row>
                <Row label="Lead source">{lead.lead_source ?? '—'}</Row>
                <Row label="Created on">{formatDateIST(lead.date_added)}</Row>
              </dl>
            </Section>

            {status === 'On Hold' && lead.on_hold_reason && <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900 ring-1 ring-amber-200"><b>On hold:</b> {lead.on_hold_reason}</p>}
            {status === 'Lost' && lead.lost_reason && <p className="rounded-xl bg-rose-50 p-3 text-[13px] text-rose-900 ring-1 ring-rose-200"><b>Lost:</b> {lead.lost_reason}{lead.lost_note ? ` · ${lead.lost_note}` : ''}</p>}
            {status === 'Converted' && lead.win_note && <p className="rounded-xl bg-teal-50 p-3 text-[13px] text-teal-900 ring-1 ring-teal-200"><b>Won:</b> {lead.win_note}</p>}

            <Section icon={<CalendarClock className="h-4 w-4" />} title="Next follow-up">
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                {lead.next_follow_up ? <FollowUpFlagBadge flag={lead.next_follow_up.flag} at={lead.next_follow_up.at} /> : <span className="text-[13px] italic text-gray-400">Nothing scheduled. Pick one when you log something above.</span>}
              </div>
              <button type="button" onClick={() => setTab('follow-ups')} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50">
                View all follow-ups
                <span className="rounded-full bg-gray-100 px-1.5 text-[11px]">{pending.length}</span>
              </button>
            </Section>

            <Section icon={<History className="h-4 w-4" />} title="Recent activity">
              <Timeline entries={timeline.slice(0, 4)} />
              {timeline.length > 4 && (
                <button type="button" onClick={() => setTab('activity')} className="mt-1 text-[13px] font-semibold text-primary hover:underline">
                  See all activity
                </button>
              )}
            </Section>
          </>
        )}

        {tab === 'details' && (
          <>
            <Section icon={<Tag className="h-4 w-4" />} title="Service fit">
              <div className="flex flex-wrap gap-2">
                {lead.service_fit?.length ? lead.service_fit.map((f) => <span key={f} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[13px] font-semibold text-primary">{f}</span>) : <span className="text-[13px] text-gray-400">Not chosen yet</span>}
              </div>
            </Section>
            <Section icon={<Building2 className="h-4 w-4" />} title="Company">
              <dl className="divide-y divide-gray-100">
                <Row label="Company ID"><span className="font-mono">{lead.company.company_code ?? '—'}</span></Row>
                <Row label="Location">{location || '—'}</Row>
                {lead.company.is_gidc && <Row label="GIDC estate">{lead.company.gidc_name ?? 'Yes'}</Row>}
              </dl>
              <Link to={`/sales/companies/${lead.company.company_id}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                View company <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Section>
            <Section icon={<User className="h-4 w-4" />} title="Primary contact">
              {lead.primary_contact ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{lead.primary_contact.name}{lead.primary_contact.designation ? <span className="font-normal text-gray-500"> · {lead.primary_contact.designation}</span> : null}</p>
                  {lead.primary_contact.mobile && (
                    <a href={`tel:${lead.primary_contact.mobile}`} className="flex h-10 items-center gap-3 rounded-xl bg-gray-50 px-3 text-[13px] ring-1 ring-gray-100 hover:bg-emerald-50">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <span className="font-mono">{lead.primary_contact.mobile}</span>
                    </a>
                  )}
                  {lead.primary_contact.email && (
                    <a href={`mailto:${lead.primary_contact.email}`} className="flex h-10 items-center gap-3 rounded-xl bg-gray-50 px-3 text-[13px] ring-1 ring-gray-100 hover:bg-blue-50">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="truncate">{lead.primary_contact.email}</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400">No contact yet.</p>
              )}
            </Section>
          </>
        )}

        {tab === 'follow-ups' && (
          <Section icon={<CalendarClock className="h-4 w-4" />} title={`Follow-ups (${followUps.length})`}>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="mb-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              Schedule a follow-up
            </button>
            {followUps.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-center text-[13px] text-gray-400">No follow-ups yet.</p>
            ) : (
              <ul className="space-y-2">
                {followUps.map((f) => (
                  <li key={f.follow_up_id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-gray-900">{f.type}</span>
                      {f.status === 'Pending' || f.status === 'Overdue' ? (
                        <FollowUpFlagBadge flag={f.status === 'Overdue' ? 'overdue' : 'upcoming'} at={f.follow_up_on} />
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{f.status}</span>
                      )}
                    </div>
                    {f.purpose && <p className="mt-1 text-xs text-gray-500">{f.purpose}</p>}
                    <p className="mt-1 text-[11px] text-gray-400">{formatDateTimeIST(f.status === 'Completed' && f.done_on ? f.done_on : f.follow_up_on)} · {f.assigned_to?.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {tab === 'activity' && (
          <Section icon={<History className="h-4 w-4" />} title="Activity">
            <Timeline entries={timeline} />
          </Section>
        )}
      </div>

      <ScheduleFollowUpModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        leadId={leadId}
        leadCode={lead.lead_code || undefined}
        companyName={lead.company?.name}
        contacts={contacts}
        onSuccess={() => {
          queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/leads') });
          queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/follow-ups') });
        }}
      />

      {/* Actions for this lead's stage */}
      <footer className={`shrink-0 border-t border-gray-100 bg-white ${showHeader ? 'px-6 py-4' : '-mx-5 mt-5 px-5 pt-4'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {primary && (
            <button
              type="button"
              onClick={() => onAction(item, primary.action)}
              className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-white shadow-sm transition ${primary.cls}`}
            >
              <primary.icon className="h-4 w-4" />
              {primary.label}
            </button>
          )}
          {(status === 'Contacted' || status === 'Qualified') && (
            <button type="button" onClick={() => onAction(item, 'hold')} title="Put on hold" aria-label="Put on hold" className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100">
              <PauseCircle className="h-4 w-4" />
            </button>
          )}
          {(status === 'New' || status === 'Contacted' || status === 'Qualified') && (
            <button type="button" onClick={() => onAction(item, 'lost')} title="Mark as lost" aria-label="Mark as lost" className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100">
              <XCircle className="h-4 w-4" />
            </button>
          )}
          {!docked && status !== 'Converted' && status !== 'New' && (
            <button type="button" onClick={() => onAction(item, 'log')} title="Log conversation" aria-label="Log conversation" className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50">
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

const CHANNELS = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit', 'Note'] as const;
type Channel = (typeof CHANNELS)[number];
const NEXT_STEPS: Array<{ id: string; label: string; days: number | null }> = [
  { id: 'none', label: 'None', days: null },
  { id: 'tomorrow', label: 'Tomorrow', days: 1 },
  { id: '3d', label: 'In 3 days', days: 3 },
  { id: '1w', label: 'Next week', days: 7 },
];

/** One place to say what happened with this lead: a call, an email, a note... and when to follow up next. */
const Composer: React.FC<{ leadId: number; locked: boolean; onContactMissing: () => void }> = ({ leadId, locked, onContactMissing }) => {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<Channel>('Call');
  const [text, setText] = useState('');
  const [next, setNext] = useState('none');
  const [error, setError] = useState<{ message: string; contact: boolean } | null>(null);
  const [saved, setSaved] = useState(false);
  const quickLog = useSalesActivityControllerQuickLog();
  const schedule = useSalesFollowUpControllerScheduleOnLead();
  const busy = quickLog.isPending || schedule.isPending;

  if (locked) return null;

  const save = async () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    setSaved(false);
    try {
      await quickLog.mutateAsync({ id: leadId, data: { type: channel, text: body } });
      const step = NEXT_STEPS.find((n) => n.id === next);
      if (step?.days) {
        const day = toInputDateIST(new Date(Date.now() + step.days * 86_400_000));
        await schedule.mutateAsync({ id: leadId, data: { type: (channel === 'Note' ? 'Call' : channel) as 'Call', follow_up_on: istInputToIso(`${day}T11:00`) } });
      }
      setText('');
      setNext('none');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/') });
    } catch (err) {
      const parsed = parseApiError(err);
      setError({ message: parsed.message, contact: parsed.fieldErrors.contact_id !== undefined });
    }
  };

  return (
    <section className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-white p-4 ring-1 ring-primary/5">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Log what happened</h3>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label="Type" className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={channel === c}
            onClick={() => setChannel(c)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition ${channel === c ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
        rows={4}
        placeholder={channel === 'Note' ? 'Write a note…' : `What was discussed on the ${channel.toLowerCase()}?`}
        className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-primary/40 focus:outline-hidden focus:ring-4 focus:ring-primary/10"
      />

      <div className="mt-2.5">
        <p className="mb-2 text-sm font-medium text-gray-600">Next follow-up</p>
        <div role="radiogroup" aria-label="Next follow-up" className="flex flex-wrap gap-1.5">
          {NEXT_STEPS.map((n) => (
            <button
              key={n.id}
              type="button"
              role="radio"
              aria-checked={next === n.id}
              onClick={() => setNext(n.id)}
              className={`h-10 rounded-xl border px-4 text-sm font-medium transition ${next === n.id ? 'border-violet-300 bg-violet-50 text-violet-700 ring-2 ring-violet-500/10' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-2.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {error.message}{' '}
          {error.contact && (
            <button type="button" onClick={onContactMissing} className="font-semibold underline">
              Add a contact
            </button>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!text.trim() || busy}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {channel === 'Note' ? 'Save note' : 'Save conversation'}
      </button>
    </section>
  );
};

const PanelTabs: React.FC<{ tab: Tab; setTab: (t: Tab) => void }> = ({ tab, setTab }) => (
  <div role="tablist" aria-label="Lead panel" className="no-scrollbar -mb-px mt-4 flex gap-1 overflow-x-auto">
    {TABS.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={tab === t.id}
        onClick={() => setTab(t.id)}
        className={`shrink-0 border-b-2 px-3.5 pb-3 pt-1 text-sm font-semibold transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const Timeline: React.FC<{ entries: TimelineEntry[] }> = ({ entries }) => {
  if (entries.length === 0) return <p className="mt-3 rounded-xl bg-gray-50 p-4 text-center text-[13px] text-gray-400">Nothing yet.</p>;
  return (
    <ul className="mt-3 space-y-3">
      {entries.map((e, i) => {
        const k = KIND_ICON[e.kind] ?? KIND_ICON.event;
        return (
          <li key={`${e.kind}-${e.ref_id ?? i}-${e.at}`} className="flex gap-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${k.tone}`}>
              <k.Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 border-b border-gray-100 pb-3 last:border-0">
              <p className="text-[13px] font-medium text-gray-800">{e.title}</p>
              {e.body && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-gray-500">{e.body}</p>}
              <p className="mt-1 text-[11px] text-gray-400">
                {formatDateIST(e.at)} · {timeAgo(e.at)}
                {e.by ? ` · ${e.by.name}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/** The lead at a glance. Docked beside the board on large screens; a bottom sheet / side drawer elsewhere. */
export const LeadQuickPanel: React.FC<LeadQuickPanelProps> = (props) => {
  if (props.docked) {
    return (
      <aside aria-label="Lead details" className="flex h-full min-h-0 flex-col overflow-hidden border-l border-gray-200 bg-white shadow-[-14px_0_36px_-16px_rgba(15,23,42,0.22)]">
        <PanelBody {...props} showHeader />
      </aside>
    );
  }
  return (
    <Drawer isOpen onClose={props.onClose} size="xl" fullOnPhone title="Lead details" subtitle="A quick look. Open the full page for everything.">
      <PanelBody {...props} showHeader={false} />
    </Drawer>
  );
};
