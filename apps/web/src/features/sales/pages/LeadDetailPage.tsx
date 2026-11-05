import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  Trophy,
  
  AlertCircle,
  ExternalLink,
  MessageSquare,
  FileText,
  History,
  Users,
  Tag,
  MapPin,
  CalendarClock,
  ChevronRight,
  Pencil,
  
} from 'lucide-react';
import {
  useSalesLeadControllerGet,
  useSalesLeadStatusControllerQualification,
  useSalesContactControllerList,
} from '@vernoxy-pulse/api-client';

import { StatusBadge } from '../components/common/StatusBadge';
import { FollowUpFlagBadge } from '../components/common/FollowUpFlagBadge';
import { DetailSkeleton } from '../components/common/SkeletonLoader';
import { useMoveLeadStage, MOVE_STAGES } from '../hooks/useMoveLeadStage';
import { MarkLostModal } from '../components/leads/MarkLostModal';
import { ChangeLeadByModal } from '../components/leads/ChangeLeadByModal';
import { MarkWonModal } from '../components/leads/MarkWonModal';
import { ReverseConversionModal } from '../components/leads/ReverseConversionModal';

import { ConversationTimeline } from '../components/leads/ConversationTimeline';
import { NotesList } from '../components/leads/NotesList';
import { LeadFollowUpsList } from '../components/leads/LeadFollowUpsList';
import { ContactsManager } from '../components/companies/ContactsManager';
import { LeadActivityTimeline } from '../components/leads/LeadActivityTimeline';

import { useSalesRights } from '../hooks/useSalesRights';
import { formatDateIST, } from '../utils/date';
import { getInitials, getAvatarColor } from '../utils/formatters';
import { parseApiError } from '../utils/error';
import type {
  LeadDetailResponse,
  LeadQualificationResponse,
  SalesContactItem,
} from '../types/sales.types';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const leadId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useSalesRights();

  // Active tab state
  type TabType = 'overview' | 'conversations' | 'notes' | 'follow-ups' | 'contacts' | 'activity';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Modals state
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [changeLeadByOpen, setChangeLeadByOpen] = useState(false);
  const [markWonOpen, setMarkWonOpen] = useState(false);
  const [reverseConversionOpen, setReverseConversionOpen] = useState(false);

  // ?action=won opens Mark as Won; ?action=log opens the Conversations tab with the Log Conversation pop-up
  const [autoOpenLog, setAutoOpenLog] = useState(false);
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'won') setMarkWonOpen(true);
    if (action === 'log') {
      setActiveTab('conversations');
      setAutoOpenLog(true);
    }
    const wanted = searchParams.get('tab');
    if (wanted === 'follow-ups' || wanted === 'notes' || wanted === 'conversations' || wanted === 'contacts' || wanted === 'activity') setActiveTab(wanted);
  }, [searchParams]);

  // Fetch lead details
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
  } = useSalesLeadControllerGet(leadId, {
    query: {
      enabled: Boolean(leadId),
    },
  });

  const lead: LeadDetailResponse | null = (
    (rawData as unknown as { data?: LeadDetailResponse })?.data ??
    (rawData as unknown as LeadDetailResponse) ??
    null
  );

  // Fetch qualification checklist (if in Contacted or New stage)
  const { data: qualRaw } = useSalesLeadStatusControllerQualification(leadId, {
    query: {
      enabled: Boolean(leadId && (lead?.status === 'Contacted' || lead?.status === 'New')),
    },
  });

  const qualData: LeadQualificationResponse | null = (
    (qualRaw as unknown as { data?: LeadQualificationResponse })?.data ??
    (qualRaw as unknown as LeadQualificationResponse) ??
    null
  );

  // Fetch company contacts for dropdowns & contacts tab
  const companyId = lead?.company?.company_id ?? 0;
  const { data: contactsRaw } = useSalesContactControllerList(companyId, {
    query: {
      enabled: Boolean(companyId),
    },
  });

  const contacts: SalesContactItem[] = (
    (contactsRaw as unknown as { data?: SalesContactItem[] })?.data ??
    (contactsRaw as unknown as SalesContactItem[]) ??
    []
  );

  const moveStage = useMoveLeadStage();
  const moveTo = (to: (typeof MOVE_STAGES)[number]) => {
    if (to === 'Lost') {
      setLostModalOpen(true); // Lost asks for a reason
      return;
    }
    moveStage.mutate(
      { leadId, to },
      { onSuccess: () => refetch(), onError: (err: unknown) => alert(parseApiError(err).message || 'Could not move this lead.') },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-lg mx-auto mt-12 shadow-2xs">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900">Failed to load sales lead</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          {parseApiError(error).message || 'Lead could not be found or you do not have permission to view it.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/sales/leads')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads Pipeline</span>
        </button>
      </div>
    );
  }

  const companyColor = getAvatarColor(lead.company?.name || 'Company');
  const companyInitials = getInitials(lead.company?.name || 'Company');

  const leadByInitials = lead.lead_by?.name ? getInitials(lead.lead_by.name) : '—';
  const leadByColor = lead.lead_by?.name ? getAvatarColor(lead.lead_by.name) : 'bg-gray-400';


  const ACCENT: Record<string, { band: string; ring: string }> = {
    New: { band: 'from-blue-500 via-sky-500 to-cyan-400', ring: 'ring-blue-100' },
    Contacted: { band: 'from-violet-500 via-purple-500 to-fuchsia-400', ring: 'ring-violet-100' },
    Qualified: { band: 'from-emerald-500 via-teal-500 to-cyan-400', ring: 'ring-emerald-100' },
    'On Hold': { band: 'from-amber-500 via-orange-400 to-yellow-400', ring: 'ring-amber-100' },
    Converted: { band: 'from-teal-500 via-emerald-500 to-lime-400', ring: 'ring-teal-100' },
    Lost: { band: 'from-slate-400 via-slate-500 to-slate-400', ring: 'ring-slate-100' },
  };
  const accent = ACCENT[lead.status] ?? ACCENT.New;
  const doneCount = qualData?.items?.filter((i) => i.done).length ?? 0;
  const totalCount = qualData?.items?.length ?? 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  // The checklist is only a guide: a lead can be moved to Qualified whether or not it is complete.
  const canQualify = totalCount > 0 && doneCount === totalCount;
  const location = [lead.company?.city, lead.company?.state].filter(Boolean).join(', ');

  const primaryBtn = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition active:scale-[0.99] sm:w-auto';
  const softBtn = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition sm:w-auto';

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Building2, count: undefined as number | undefined },
    { id: 'conversations' as const, label: 'Conversations', icon: MessageSquare, count: lead.counts?.conversations || 0 },
    { id: 'notes' as const, label: 'Notes', icon: FileText, count: lead.counts?.notes || 0 },
    { id: 'follow-ups' as const, label: 'Follow-ups', icon: Calendar, count: lead.counts?.open_follow_ups || 0 },
    { id: 'contacts' as const, label: 'Contacts', icon: Users, count: contacts.length },
    { id: 'activity' as const, label: 'Activity', icon: History, count: undefined as number | undefined },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-20 sm:space-y-5">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Link to="/sales/leads" className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 transition hover:bg-white hover:text-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" />
          Leads
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        <span className="font-mono text-gray-700">{lead.lead_code || `LEAD-${lead.lead_id}`}</span>
      </nav>

      {/* Hero */}
      <section className={`overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-4 sm:rounded-3xl ${accent.ring}`}>
        <div className={`h-1.5 bg-gradient-to-r ${accent.band}`} aria-hidden="true" />

        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-lg ${companyColor}`}>{companyInitials}</div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} size="md" />
                  <span className="whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-600">{lead.lead_code || `LEAD-${lead.lead_id}`}</span>
                </div>

                <Link to={`/sales/companies/${lead.company?.company_id}`} className="mt-1.5 flex items-center gap-2 text-xl font-bold leading-tight tracking-tight text-gray-900 transition-colors hover:text-primary sm:text-2xl">
                  <span className="truncate">{lead.company?.name}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-300" />
                </Link>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-500">
                  {location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    Added {formatDateIST(lead.date_added)}
                  </span>
                  {lead.lead_source && (
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      {lead.lead_source}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Owner and next follow-up */}
            <div className="grid shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[19rem] lg:grid-cols-1">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                {lead.lead_by ? (
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${leadByColor}`}>{leadByInitials}</span>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-400">
                    <User className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-gray-400">Lead owner</p>
                  <p className="truncate text-sm font-semibold text-gray-900">{lead.lead_by?.name ?? 'Unassigned'}</p>
                </div>
                {isAdmin && (
                  <button type="button" onClick={() => setChangeLeadByOpen(true)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-primary ring-1 ring-gray-200 transition hover:bg-gray-50">
                    <Pencil className="h-3 w-3" />
                    {lead.lead_by ? 'Change' : 'Assign'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-medium text-gray-400">Next follow-up</p>
                  {lead.next_follow_up ? (
                    <FollowUpFlagBadge flag={lead.next_follow_up.flag} at={lead.next_follow_up.at} />
                  ) : (
                    <p className="text-sm italic text-gray-400">Nothing scheduled</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:flex-wrap sm:items-end">
            {lead.status !== 'Converted' && (
              <div className="flex w-full flex-col gap-1.5 sm:w-auto">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Move to stage</p>
                <div role="group" aria-label="Move to stage" className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
                  {MOVE_STAGES.map((st) => {
                    const current = lead.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={current || moveStage.isPending}
                        aria-pressed={current}
                        onClick={() => moveTo(st)}
                        className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${
                          current ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-gray-900 disabled:opacity-50'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {lead.status !== 'Converted' && lead.status !== 'Lost' && (
              <button type="button" onClick={() => setMarkWonOpen(true)} className={`${primaryBtn} bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/25 hover:brightness-110`}>
                <Trophy className="h-4 w-4" />
                Mark as Won
              </button>
            )}

            {lead.status === 'Converted' && isAdmin && (
              <button type="button" onClick={() => setReverseConversionOpen(true)} className={`${softBtn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}>
                <RotateCcw className="h-4 w-4" />
                Reverse client conversion
              </button>
            )}

            {lead.status === 'Converted' && lead.client_id && (
              <Link to={`/sales/clients/${lead.client_id}`} className={`${softBtn} border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100`}>
                <Trophy className="h-4 w-4 text-teal-600" />
                Open client {lead.client_code ?? ''}
              </Link>
            )}

            {isAdmin && lead.status !== 'Converted' && (
              <button type="button" onClick={() => setChangeLeadByOpen(true)} className={`${softBtn} border-gray-200 bg-white text-gray-600 hover:bg-gray-50 sm:ml-auto`}>
                <UserCheck className="h-4 w-4 text-gray-400" />
                Change lead owner
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Qualification checklist */}
      {(lead.status === 'Contacted' || lead.status === 'New') && qualData && (
        <section className={`rounded-2xl border p-4 sm:rounded-3xl sm:p-5 ${canQualify ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${canQualify ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 shadow-amber-500/30'}`}>
                {canQualify ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">{canQualify ? 'Ready to qualify' : 'Qualification checklist (a guide)'}</h2>
                <p className="mt-0.5 text-[13px] text-gray-600">
                  {canQualify ? 'Everything is in place. You can move this deal to Qualified.' : `${doneCount} of ${totalCount} done. You can still move this deal to Qualified at any time.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => moveTo('Qualified')}
              disabled={moveStage.isPending}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Qualify deal
            </button>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-all duration-500 ${canQualify ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
          </div>

          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {qualData.items?.map((item, idx) => (
              <li key={idx} className={`flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-[13px] font-medium ${item.done ? 'border-emerald-200 text-emerald-800' : 'border-amber-200 text-amber-800'}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3 w-3" />}
                </span>
                <span className={item.done ? 'line-through decoration-emerald-300' : ''}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabs */}
      <div className="sticky top-16 z-10 -mx-1 bg-gradient-to-b from-slate-50 via-slate-50 to-transparent px-1 pb-1 pt-1 lg:static lg:bg-none">
        <div role="tablist" aria-label="Lead sections" className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-gray-100/80 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-semibold transition-all ${
                  isActive ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/70' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-white text-gray-500'}`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Quick numbers */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              { tab: 'conversations' as const, label: 'Conversations', value: lead.counts?.conversations || 0, Icon: MessageSquare, tile: 'bg-blue-500 shadow-blue-500/30', card: 'from-blue-50' },
              { tab: 'notes' as const, label: 'Notes', value: lead.counts?.notes || 0, Icon: FileText, tile: 'bg-amber-500 shadow-amber-500/30', card: 'from-amber-50' },
              { tab: 'follow-ups' as const, label: 'Open follow-ups', value: lead.counts?.open_follow_ups || 0, Icon: CalendarClock, tile: 'bg-violet-500 shadow-violet-500/30', card: 'from-violet-50' },
            ].map(({ tab, label, value, Icon, tile, card }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-start gap-2 rounded-2xl border border-gray-200/70 bg-gradient-to-br ${card} to-white p-3 text-left shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:gap-3 sm:p-4`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md sm:h-10 sm:w-10 ${tile}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-xl font-extrabold leading-none tracking-tight text-gray-900 sm:text-2xl">{value}</span>
                  <span className="mt-1 block text-[11px] font-semibold text-gray-500 sm:text-xs">{label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* How this lead ended up (hold, lost, won) */}
          {lead.status === 'On Hold' && lead.on_hold_reason && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">On hold because</p>
              <p className="mt-1 whitespace-pre-line">{lead.on_hold_reason}</p>
            </div>
          )}
          {lead.status === 'Lost' && (lead.lost_reason || lead.lost_note) && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Lost</p>
              {lead.lost_reason && <p className="mt-1 font-semibold">{lead.lost_reason}</p>}
              {lead.lost_note && <p className="mt-1 whitespace-pre-line text-rose-800">{lead.lost_note}</p>}
            </div>
          )}
          {lead.status === 'Converted' && (
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 text-sm text-teal-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Won{lead.won_on ? ` on ${formatDateIST(lead.won_on)}` : ''}</p>
              {lead.win_note && <p className="mt-1 whitespace-pre-line">{lead.win_note}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <div className="space-y-4 sm:space-y-5 lg:col-span-2">
              {/* Service fit */}
              <section className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-2xs sm:rounded-3xl sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" />
                  </span>
                  <h2 className="text-[15px] font-semibold text-gray-900">Service fit</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.service_fit && lead.service_fit.length > 0 ? (
                    lead.service_fit.map((fit) => (
                      <span key={fit} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[13px] font-semibold text-primary">
                        {fit}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No service fit chosen yet.</span>
                  )}
                </div>
              </section>

              {/* Company */}
              <section className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-2xs sm:rounded-3xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <h2 className="text-[15px] font-semibold text-gray-900">Company</h2>
                  </div>
                  <Link to={`/sales/companies/${lead.company?.company_id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                    View company
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium text-gray-400">Name</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900">{lead.company?.name}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium text-gray-400">Company ID</dt>
                    <dd className="mt-0.5 font-mono text-sm text-gray-800">{lead.company?.company_code || '—'}</dd>
                  </div>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <dt className="text-[11px] font-medium text-gray-400">Location</dt>
                    <dd className="mt-0.5 truncate text-sm text-gray-800">{location || '—'}</dd>
                  </div>
                  {lead.company?.is_gidc && (
                    <div className="col-span-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[13px] ring-1 ring-gray-100 sm:col-span-3">
                      <span className="font-semibold text-gray-900">GIDC estate:</span> <span className="text-gray-700">{lead.company.gidc_name}</span>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            {/* Contact */}
            <section className="h-fit rounded-2xl border border-gray-200/70 bg-white p-4 shadow-2xs sm:rounded-3xl sm:p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <User className="h-4 w-4" />
                </span>
                <h2 className="text-[15px] font-semibold text-gray-900">Primary contact</h2>
              </div>

              {lead.primary_contact ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(lead.primary_contact.name)}`}>{getInitials(lead.primary_contact.name)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-gray-900">{lead.primary_contact.name}</p>
                      {lead.primary_contact.designation && <p className="truncate text-[13px] text-gray-500">{lead.primary_contact.designation}</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {lead.primary_contact.mobile && (
                      <a href={`tel:${lead.primary_contact.mobile}`} className="flex h-11 items-center gap-3 rounded-xl bg-gray-50 px-3 text-sm text-gray-800 ring-1 ring-gray-100 transition hover:bg-emerald-50 hover:ring-emerald-200">
                        <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="font-mono">{lead.primary_contact.mobile}</span>
                      </a>
                    )}
                    {lead.primary_contact.email && (
                      <a href={`mailto:${lead.primary_contact.email}`} className="flex h-11 items-center gap-3 rounded-xl bg-gray-50 px-3 text-sm text-gray-800 ring-1 ring-gray-100 transition hover:bg-blue-50 hover:ring-blue-200">
                        <Mail className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="truncate">{lead.primary_contact.email}</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-3 text-sm text-gray-400">No primary contact yet.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'conversations' && (
        <ConversationTimeline leadId={leadId} contacts={contacts} autoOpen={autoOpenLog} />
      )}

      {activeTab === 'notes' && <NotesList leadId={leadId} />}

      {activeTab === 'follow-ups' && (
        <LeadFollowUpsList
          leadId={leadId}
          leadCode={lead.lead_code || undefined}
          companyName={lead.company?.name}
          contacts={contacts}
        />
      )}

      {activeTab === 'contacts' && (
        <ContactsManager companyId={companyId} contacts={contacts} />
      )}

      {activeTab === 'activity' && <LeadActivityTimeline leadId={leadId} />}

      {/* Modals */}
      <MarkLostModal
        isOpen={lostModalOpen}
        onClose={() => setLostModalOpen(false)}
        leadId={leadId}
        leadCode={lead.lead_code || undefined}
        companyName={lead.company?.name}
        onSuccess={() => refetch()}
      />

      <ChangeLeadByModal
        isOpen={changeLeadByOpen}
        onClose={() => setChangeLeadByOpen(false)}
        leadId={leadId}
        leadCode={lead.lead_code || undefined}
        companyName={lead.company?.name}
        currentLeadByEmpId={lead.lead_by?.emp_id}
        onSuccess={() => refetch()}
      />

      <MarkWonModal
        isOpen={markWonOpen}
        onClose={() => setMarkWonOpen(false)}
        leadId={leadId}
        leadCode={lead.lead_code || undefined}
        companyName={lead.company?.name}
        onSuccess={() => refetch()}
      />

      <ReverseConversionModal
        isOpen={reverseConversionOpen}
        onClose={() => setReverseConversionOpen(false)}
        leadId={leadId}
        leadCode={lead.lead_code || undefined}
        companyName={lead.company?.name}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
