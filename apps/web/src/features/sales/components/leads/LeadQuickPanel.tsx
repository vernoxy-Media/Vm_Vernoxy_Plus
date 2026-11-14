import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  PhoneOff,
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
  Globe,
  MapPin,
  ChevronDown,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  FolderKanban,
  MessagesSquare,
} from 'lucide-react';
import { CallDurationInput, EMPTY_DURATION, durationError, durationSeconds, type DurationValue } from '../common/CallDurationInput';
import {
  useSalesActivityControllerQuickLog,
  customFetch,
  useSalesFollowUpControllerScheduleOnLead,
  useSalesActivityControllerTimeline,
  useSalesFollowUpControllerForLead,
  useSalesLeadControllerGet,
  useSalesContactControllerList,
  useSalesCompanyControllerGet,
} from '@vernoxy-pulse/api-client';
import { Drawer } from '../common/Drawer';
import { ConversationTimeline } from './ConversationTimeline';
import { useCompanyProjects } from '../../hooks/useCompanyProjects';
import { FollowUpFlagBadge } from '../common/FollowUpFlagBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ScheduleFollowUpModal } from '../follow-ups/ScheduleFollowUpModal';
import { CompleteFollowUpModal } from '../follow-ups/CompleteFollowUpModal';
import { RescheduleFollowUpModal } from '../follow-ups/RescheduleFollowUpModal';
import { CancelFollowUpModal } from '../follow-ups/CancelFollowUpModal';
import { formatDateIST, formatDateTimeIST, istInputToIso, timeAgo, toInputDateIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import { unwrapList } from '../../utils/response';
import { formatCurrencyINR, getAvatarColor, getInitials } from '../../utils/formatters';
import type { FollowUpItem, SalesContactItem, SalesFollowUpItem, SalesCompanyDetailResponse, LeadDetailResponse, LeadListItem, TimelineEntry } from '../../types/sales.types';
import type { LeadCardAction } from './LeadKanbanCard';

export interface LeadQuickPanelProps {
  leadId: number;
  onClose: () => void;
  onAction: (lead: LeadListItem, action: LeadCardAction) => void;
  /** Docked beside the board (large screens), or a bottom sheet / side drawer. */
  docked: boolean;
}

type Tab = 'overview' | 'details' | 'conversations' | 'follow-ups' | 'activity';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'conversations', label: 'Conversations' },
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

const toModalItem = (f: FollowUpItem): SalesFollowUpItem => ({
  id: f.follow_up_id,
  lead_id: f.related_to.lead_id,
  company_name: f.company.name,
  contact_name: f.contact?.name,
  type: f.type as SalesFollowUpItem['type'],
  due_date: f.follow_up_on,
  status: f.status,
  purpose: f.purpose,
  assigned_to_name: f.assigned_to.name,
  rescheduled_count: f.rescheduled_count,
});

/** The tab of the Follow-ups page this follow-up lives on. */
const followUpTab = (f: FollowUpItem): string => {
  if (f.status === 'Completed') return 'completed';
  if (f.status === 'Cancelled') return 'cancelled';
  if (f.status === 'Overdue') return 'overdue';
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(f.follow_up_on).getTime() <= endOfToday.getTime() ? 'today' : 'upcoming';
};

const socialLinks = [
  { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin },
  { key: 'instagram_url', label: 'Instagram', Icon: Instagram },
  { key: 'facebook_url', label: 'Facebook', Icon: Facebook },
  { key: 'youtube_url', label: 'YouTube', Icon: Youtube },
  { key: 'google_business_profile_url', label: 'Google profile', Icon: MapPin },
] as const;

const asUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

const PanelBody: React.FC<LeadQuickPanelProps & { showHeader: boolean }> = ({ leadId, onClose, onAction, docked, showHeader }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [openFollowUp, setOpenFollowUp] = useState<number | null>(null);
  const [activityLimit, setActivityLimit] = useState(30);
  const [completeTarget, setCompleteTarget] = useState<SalesFollowUpItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<SalesFollowUpItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesFollowUpItem | null>(null);
  const { data: leadRaw, isLoading } = useSalesLeadControllerGet(leadId);
  const lead = ((leadRaw as unknown as { data?: LeadDetailResponse })?.data ?? (leadRaw as unknown as LeadDetailResponse | undefined)) ?? null;
  const companyId = lead?.company?.company_id ?? 0;
  const { data: contactsRaw } = useSalesContactControllerList(companyId, { query: { enabled: Boolean(companyId) && (scheduleOpen || tab === 'conversations') } });
  const contacts = unwrapList<SalesContactItem>(contactsRaw);
  const { data: companyRaw, isLoading: companyLoading } = useSalesCompanyControllerGet(companyId, { query: { enabled: Boolean(companyId) && tab === 'details' } });
  const companyFull = ((companyRaw as unknown as { data?: SalesCompanyDetailResponse })?.data ?? (companyRaw as unknown as SalesCompanyDetailResponse | undefined)) ?? null;
  const { data: projects = [], isLoading: projectsLoading } = useCompanyProjects(companyId, tab === 'details');
  const { data: fuRaw, refetch: refetchFollowUps } = useSalesFollowUpControllerForLead(leadId, { query: { enabled: tab === 'follow-ups' || tab === 'overview' } });
  const followUps = unwrapList<FollowUpItem>(fuRaw);
  const { data: tlRaw } = useSalesActivityControllerTimeline(leadId, { limit: tab === 'activity' ? activityLimit : 12 }, { query: { enabled: tab === 'overview' || tab === 'activity' } });
  const timeline = unwrapList<TimelineEntry>(tlRaw);

  if (isLoading || !lead) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const refreshFollowUps = () => {
    refetchFollowUps();
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/leads') });
    queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/follow-ups') });
  };

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

      <div className={`min-h-0 flex-1 space-y-7 ${showHeader ? 'custom-scrollbar overflow-y-auto overscroll-contain px-6 py-6' : ''}`}>
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
                {companyFull?.fields.industry && <Row label="Industry">{companyFull.fields.industry}</Row>}
                {companyFull?.fields.nature_of_business && <Row label="Nature of business">{companyFull.fields.nature_of_business}</Row>}
                {companyFull?.fields.products_services && <Row label="Products / services">{companyFull.fields.products_services}</Row>}
                <Row label="Location">{[companyFull?.fields.full_address, location, companyFull?.fields.pin].filter(Boolean).join(', ') || '—'}</Row>
                {(lead.company.is_gidc || companyFull?.fields.is_gidc) && (
                  <Row label="GIDC">{[companyFull?.fields.gidc_name ?? lead.company.gidc_name, companyFull?.fields.gidc_area_phase].filter(Boolean).join(' · ') || 'Yes'}</Row>
                )}
                {companyFull?.fields.year_established ? <Row label="Established">{companyFull.fields.year_established}</Row> : null}
                {companyFull?.fields.estimated_employees ? <Row label="Employees">{companyFull.fields.estimated_employees}</Row> : null}
                {companyFull?.fields.estimated_turnover ? <Row label="Turnover">{formatCurrencyINR(companyFull.fields.estimated_turnover)}</Row> : null}
                {companyFull?.fields.no_of_plants || companyFull?.fields.no_of_branches ? (
                  <Row label="Plants / branches">{companyFull.fields.no_of_plants ?? 0} plants · {companyFull.fields.no_of_branches ?? 0} branches</Row>
                ) : null}
                {companyFull?.fields.existing_major_clients && <Row label="Major clients">{companyFull.fields.existing_major_clients}</Row>}
              </dl>
              {companyLoading && <p className="mt-2 flex items-center gap-2 text-xs text-gray-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading company details…</p>}
              {companyFull?.fields.google_maps_url && (
                <a href={companyFull.fields.google_maps_url} target="_blank" rel="noreferrer" className="mt-2 mr-4 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                  <MapPin className="h-3.5 w-3.5" /> Open map
                </a>
              )}
              <Link to={`/sales/companies/${lead.company.company_id}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                View company <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Section>

            {companyFull && (companyFull.fields.website || socialLinks.some((l) => companyFull.fields[l.key])) && (
              <Section icon={<Globe className="h-4 w-4" />} title="Online presence">
                <div className="flex flex-wrap gap-2">
                  {companyFull.fields.website && (
                    <a href={asUrl(companyFull.fields.website)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-gray-50 px-3 text-[13px] font-medium text-gray-700 ring-1 ring-gray-100 hover:bg-blue-50">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span className="max-w-[12rem] truncate">{companyFull.fields.website}</span>
                      {companyFull.fields.website_quality && <span className="rounded-full bg-white px-1.5 text-[11px] text-gray-500">{companyFull.fields.website_quality}</span>}
                    </a>
                  )}
                  {socialLinks.map(({ key, label, Icon }) =>
                    companyFull.fields[key] ? (
                      <a key={key} href={asUrl(companyFull.fields[key] as string)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-gray-50 px-3 text-[13px] font-medium text-gray-700 ring-1 ring-gray-100 hover:bg-blue-50">
                        <Icon className="h-4 w-4 text-gray-500" />
                        {label}
                      </a>
                    ) : null,
                  )}
                </div>
              </Section>
            )}

            <Section icon={<FolderKanban className="h-4 w-4" />} title={`Projects${projects.length ? ` (${projects.length})` : ''}`}>
              {projectsLoading ? (
                <p className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading projects…</p>
              ) : projects.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-3 text-[13px] text-gray-400">No projects for this company yet.</p>
              ) : (
                <ul className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
                  {projects.map((pr) => (
                    <li key={pr.project_id}>
                      <Link to={`/projects/${pr.project_id}`} className="block rounded-xl border border-gray-200 bg-white p-3 transition hover:border-primary/40 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-gray-900" title={pr.project_name}>{pr.project_name}</p>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">{pr.project_status.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">
                          <span className="font-mono">{pr.project_no}</span> · {pr.category.replace(/_/g, ' ')} · {pr.members_count} member{pr.members_count === 1 ? '' : 's'}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {formatDateIST(pr.start_date)} → {formatDateIST(pr.deadline)}{pr.manager ? ` · Manager: ${pr.manager.name}` : ''}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={<User className="h-4 w-4" />} title={`Contacts${companyFull?.contacts?.length ? ` (${companyFull.contacts.length})` : ''}`}>
              {(companyFull?.contacts?.length ?? 0) > 0 ? (
                <ul className="space-y-2">
                  {companyFull!.contacts.map((p) => (
                    <li key={p.company_person_id} className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-gray-900">
                        {p.name}
                        {p.designation && <span className="font-normal text-gray-500">· {p.designation}</span>}
                        {p.is_primary && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Primary</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.mobile && (
                          <a href={`tel:${p.mobile}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-50 px-3 text-[13px] ring-1 ring-gray-100 hover:bg-emerald-50">
                            <Phone className="h-4 w-4 text-emerald-600" />
                            <span className="font-mono">{p.mobile}</span>
                          </a>
                        )}
                        {p.email && (
                          <a href={`mailto:${p.email}`} className="inline-flex h-9 min-w-0 items-center gap-2 rounded-lg bg-gray-50 px-3 text-[13px] ring-1 ring-gray-100 hover:bg-blue-50">
                            <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate">{p.email}</span>
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : lead.primary_contact ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{lead.primary_contact.name}{lead.primary_contact.designation ? <span className="font-normal text-gray-500"> · {lead.primary_contact.designation}</span> : null}</p>
                  {lead.primary_contact.mobile && <p className="font-mono text-[13px] text-gray-600">{lead.primary_contact.mobile}</p>}
                  {lead.primary_contact.email && <p className="text-[13px] text-gray-600">{lead.primary_contact.email}</p>}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400">No contact yet.</p>
              )}
            </Section>
          </>
        )}

        {tab === 'conversations' && (
          <Section icon={<MessagesSquare className="h-4 w-4" />} title="Conversations">
            <ConversationTimeline leadId={leadId} contacts={contacts} />
          </Section>
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
              <ul className="custom-scrollbar -mr-1 max-h-[calc(100vh-24rem)] min-h-[8rem] space-y-2 overflow-y-auto overscroll-contain pb-1 pr-1">
                {followUps.map((f) => {
                  const open = openFollowUp === f.follow_up_id;
                  const isOpenItem = f.status === 'Pending' || f.status === 'Overdue';
                  return (
                    <li key={f.follow_up_id} className={`overflow-hidden rounded-xl border bg-white transition-shadow ${open ? 'border-primary/40 shadow-md ring-1 ring-primary/10' : 'border-gray-200 hover:border-gray-300'}`}>
                      <button type="button" onClick={() => setOpenFollowUp(open ? null : f.follow_up_id)} aria-expanded={open} className="block w-full p-3 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-gray-900">{f.type}</span>
                          <span className="flex items-center gap-2">
                            {isOpenItem ? (
                              <FollowUpFlagBadge flag={f.status === 'Overdue' ? 'overdue' : 'upcoming'} at={f.follow_up_on} />
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{f.status}</span>
                            )}
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </span>
                        </div>
                        {f.purpose && <p className={`mt-1 text-xs text-gray-500 ${open ? '' : 'line-clamp-1'}`}>{f.purpose}</p>}
                        <p className="mt-1 text-[11px] text-gray-400">{formatDateTimeIST(f.status === 'Completed' && f.done_on ? f.done_on : f.follow_up_on)} · {f.assigned_to?.name}</p>
                      </button>

                      {open && (
                        <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 p-3">
                          <dl className="divide-y divide-gray-100 text-xs">
                            <Row label="Due">{formatDateTimeIST(f.follow_up_on)}</Row>
                            {f.contact && <Row label="With">{f.contact.name}</Row>}
                            <Row label="Assigned to">{f.assigned_to?.name ?? '—'}</Row>
                            {f.rescheduled_count > 0 && <Row label="Rescheduled">{f.rescheduled_count} time{f.rescheduled_count === 1 ? '' : 's'}</Row>}
                            {f.done_on && <Row label="Done on">{formatDateTimeIST(f.done_on)}</Row>}
                            {f.outcome && <Row label="Outcome">{f.outcome}</Row>}
                            {f.what_happened && <Row label="What happened">{f.what_happened}</Row>}
                            {f.reason && <Row label="Reason">{f.reason}</Row>}
                          </dl>

                          <div className="flex flex-wrap items-center gap-2">
                            {f.actions.includes('complete') && (
                              <button type="button" onClick={() => setCompleteTarget(toModalItem(f))} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Complete
                              </button>
                            )}
                            {f.actions.includes('reschedule') && (
                              <button type="button" onClick={() => setRescheduleTarget(toModalItem(f))} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50">
                                <RotateCcw className="h-4 w-4 text-gray-500" />
                                Reschedule
                              </button>
                            )}
                            {f.actions.includes('cancel') && (
                              <button type="button" onClick={() => setCancelTarget(toModalItem(f))} title="Cancel follow-up" aria-label="Cancel follow-up" className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100">
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            <Link to={`/sales/follow-ups?tab=${followUpTab(f)}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-semibold text-primary transition hover:bg-gray-50 sm:flex-none">
                              <ExternalLink className="h-4 w-4" />
                              Open
                            </Link>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        )}

        {tab === 'activity' && (
          <Section icon={<History className="h-4 w-4" />} title="Activity">
            <ActivityFeed entries={timeline} canLoadMore={timeline.length >= activityLimit} onLoadMore={() => setActivityLimit((n) => n + 30)} />
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
        addContactHref={`/sales/leads/${leadId}?tab=contacts`}
        onSuccess={() => {
          queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/leads') });
          queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/v1/sales/follow-ups') });
        }}
      />

      {/* Complete / reschedule / cancel straight from the panel */}
      <CompleteFollowUpModal isOpen={Boolean(completeTarget)} onClose={() => setCompleteTarget(null)} followUp={completeTarget} onSuccess={refreshFollowUps} />
      <RescheduleFollowUpModal isOpen={Boolean(rescheduleTarget)} onClose={() => setRescheduleTarget(null)} followUp={rescheduleTarget} onSuccess={refreshFollowUps} />
      <CancelFollowUpModal isOpen={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} followUp={cancelTarget} onSuccess={refreshFollowUps} />

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
  const [callStatus, setCallStatus] = useState<'' | 'Received' | 'Not received'>('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<DurationValue>(EMPTY_DURATION);
  const [durationShown, setDurationShown] = useState(false);
  const { data: reasons = [] } = useQuery({
    queryKey: ['lookups', 'call_not_received_reason'],
    queryFn: () => customFetch<Array<{ id: number; label: string }>>('/api/v1/lookups/options?type=call_not_received_reason'),
    enabled: channel === 'Call',
    staleTime: 5 * 60_000,
  });
  const quickLog = useSalesActivityControllerQuickLog();
  const schedule = useSalesFollowUpControllerScheduleOnLead();
  const busy = quickLog.isPending || schedule.isPending;

  if (locked) return null;

  const isCall = channel === 'Call';
  const notReceived = isCall && callStatus === 'Not received';
  // A call is Received (say what was discussed) or Not received (pick a reason). Everything else needs the text.
  const ready = isCall ? (callStatus === 'Received' ? Boolean(text.trim()) && !durationError(duration) : notReceived && Boolean(reason)) : Boolean(text.trim());

  const save = async () => {
    const body = text.trim();
    if (!ready) return;
    setError(null);
    setSaved(false);
    try {
      await quickLog.mutateAsync({
        id: leadId,
        data: (isCall
          ? { type: channel, text: body || undefined, call_status: callStatus, not_received_reason: notReceived ? reason : undefined, call_duration_seconds: callStatus === 'Received' ? durationSeconds(duration) ?? undefined : undefined }
          : { type: channel, text: body }) as never,
      });
      const step = NEXT_STEPS.find((n) => n.id === next);
      if (step?.days) {
        const day = toInputDateIST(new Date(Date.now() + step.days * 86_400_000));
        await schedule.mutateAsync({ id: leadId, data: { type: (channel === 'Note' ? 'Call' : channel) as 'Call', follow_up_on: istInputToIso(`${day}T11:00`) } });
      }
      setText('');
      setNext('none');
      setCallStatus('');
      setReason('');
      setDuration(EMPTY_DURATION);
      setDurationShown(false);
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

      {isCall && (
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-gray-600">
            Was the call received? <span className="text-rose-500">*</span>
          </p>
          <div role="radiogroup" aria-label="Call status" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={callStatus === 'Received'}
              onClick={() => setCallStatus('Received')}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${callStatus === 'Received' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <CheckCircle2 className="h-4 w-4" /> Received
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={callStatus === 'Not received'}
              onClick={() => setCallStatus('Not received')}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${callStatus === 'Not received' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <PhoneOff className="h-4 w-4" /> Not received
            </button>
          </div>
          {notReceived && (
            <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason the call was not received" className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 focus:border-primary/40 focus:outline-hidden focus:ring-4 focus:ring-primary/10">
              <option value="">Select why it was not received...</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {isCall && callStatus === 'Received' && (
        <div className="mt-3" onBlur={() => setDurationShown(true)}>
          <CallDurationInput compact value={duration} onChange={setDuration} error={durationShown ? durationError(duration) : null} />
        </div>
      )}

      {(!isCall || callStatus) && (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
        rows={4}
        placeholder={channel === 'Note' ? 'Write a note…' : notReceived ? 'Anything worth remembering about this attempt (optional)' : `What was discussed on the ${channel.toLowerCase()}?`}
        className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-primary/40 focus:outline-hidden focus:ring-4 focus:ring-primary/10"
      />
      )}

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
        disabled={!ready || busy}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {channel === 'Note' ? 'Save note' : notReceived ? 'Save attempt' : 'Save conversation'}
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

const FEED_FILTERS: Array<{ id: 'all' | TimelineEntry['kind']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'conversation', label: 'Conversations' },
  { id: 'follow_up', label: 'Follow-ups' },
  { id: 'status_change', label: 'Status' },
  { id: 'note', label: 'Notes' },
];

const dayLabel = (iso: string): string => {
  const day = formatDateIST(iso);
  const now = new Date();
  if (day === formatDateIST(now.toISOString())) return 'Today';
  if (day === formatDateIST(new Date(now.getTime() - 86_400_000).toISOString())) return 'Yesterday';
  return day;
};

/** The whole history: filter chips, grouped by day, one connected line, "load more" at the end. */
const ActivityFeed: React.FC<{ entries: TimelineEntry[]; canLoadMore: boolean; onLoadMore: () => void }> = ({ entries, canLoadMore, onLoadMore }) => {
  const [filter, setFilter] = useState<'all' | TimelineEntry['kind']>('all');
  const shown = filter === 'all' ? entries : entries.filter((e) => e.kind === filter);

  const groups: Array<{ label: string; items: TimelineEntry[] }> = [];
  for (const e of shown) {
    const label = dayLabel(e.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
        {FEED_FILTERS.map((f) => {
          const count = f.id === 'all' ? entries.length : entries.filter((e) => e.kind === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition ${filter === f.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[10px] ${filter === f.id ? 'bg-white/25' : 'bg-white text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-[13px] text-gray-400">Nothing here yet.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.label}>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{g.label}</h4>
              <ul className="relative space-y-1 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-gray-200">
                {g.items.map((e, i) => {
                  const k = KIND_ICON[e.kind] ?? KIND_ICON.event;
                  const future = new Date(e.at).getTime() > Date.now();
                  return (
                    <li key={`${e.kind}-${e.ref_id ?? i}-${e.at}`} className="relative flex gap-3 rounded-xl p-1.5 transition hover:bg-gray-50">
                      <span className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${k.tone}`}>
                        <k.Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug text-gray-800">{e.title}</p>
                        {e.body && <p className="mt-1 whitespace-pre-line rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">{e.body}</p>}
                        <p className="mt-1 text-[11px] text-gray-400">
                          {formatDateTimeIST(e.at)}
                          {future ? ' · scheduled' : ` · ${timeAgo(e.at)}`}
                          {e.by ? ` · ${e.by.name}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canLoadMore && (
        <button type="button" onClick={onLoadMore} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50">
          Load older activity
        </button>
      )}
    </div>
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
