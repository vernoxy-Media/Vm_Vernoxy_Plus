import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pause, Pencil, Play, CheckCheck } from 'lucide-react';
import { useCampaign, useCampaignMasters, useUpdateCampaign } from '../hooks/useCampaigns';
import { useSalesRights } from '../hooks/useSalesRights';
import { parseApiError } from '../utils/error';
import type { Campaign, CampaignCompany, CampaignDetail, CampaignDetailAdmin, MyCampaignStats } from '../types/campaign.types';
import { CampaignCompaniesTable } from '../components/campaigns/CampaignCompaniesTable';
import { AddCompaniesPanel } from '../components/campaigns/AddCompaniesPanel';
import { AssignPanel } from '../components/campaigns/AssignPanel';
import { LogCallModal } from '../components/campaigns/LogCallModal';
import { CallHistoryModal } from '../components/campaigns/CallHistoryModal';
import { CampaignStatusPill, KpiCard, ProgressBar, cardCls, fmtDay, primaryBtn, secondaryBtn } from '../components/campaigns/campaign-ui';

type Tab = 'companies' | 'add' | 'assign';
const TABS: { id: Tab; label: string }[] = [
  { id: 'companies', label: 'Companies' },
  { id: 'add', label: 'Add companies' },
  { id: 'assign', label: 'Assign & targets' },
];

const isAdminDetail = (d: CampaignDetail): d is CampaignDetailAdmin => 'workload' in d;

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams();
  const campaignId = Number(id);
  const { isAdmin } = useSalesRights();
  const { data, isLoading, isError, error, refetch } = useCampaign(Number.isFinite(campaignId) ? campaignId : undefined);
  const { data: masters } = useCampaignMasters();

  const [logFor, setLogFor] = useState<CampaignCompany | null>(null);
  const [historyFor, setHistoryFor] = useState<CampaignCompany | null>(null);

  if (isLoading) return <p className="py-12 text-center text-sm text-gray-500">Loading…</p>;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p role="alert" className="text-sm text-rose-600">{parseApiError(error).message}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className={secondaryBtn} onClick={() => refetch()}>Try again</button>
          <Link to="/sales/campaigns" className={secondaryBtn}>Back to campaigns</Link>
        </div>
      </div>
    );
  }

  const campaign = data.campaign;
  const active = campaign.status === 'Active';

  return (
    <div className="space-y-5 pb-12">
      <div>
        <Link to="/sales/campaigns" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Campaigns
        </Link>
        <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{campaign.name}</h1>
              <CampaignStatusPill status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {campaign.campaign_type}
              {campaign.target_cities.length > 0 && ` · ${campaign.target_cities.join(', ')}`}
              {campaign.target_state && ` · ${campaign.target_state}`}
              {campaign.industry_name && ` · ${campaign.industry_name}`}
              {` · ${fmtDay(campaign.start_date)} – ${fmtDay(campaign.end_date)}`}
            </p>
            {campaign.objective && <p className="mt-1 text-sm text-gray-700">{campaign.objective}</p>}
          </div>
          {isAdmin && <AdminActions campaign={campaign} />}
        </div>
      </div>

      {isAdmin && isAdminDetail(data) ? (
        <AdminBody detail={data} employees={masters?.employees ?? []} onLogCall={setLogFor} onHistory={setHistoryFor} />
      ) : !isAdminDetail(data) ? (
        <EmployeeBody campaign={campaign} mine={data.mine} employees={masters?.employees ?? []} onLogCall={setLogFor} onHistory={setHistoryFor} />
      ) : null}

      <LogCallModal
        isOpen={logFor !== null}
        onClose={() => setLogFor(null)}
        campaignId={campaignId}
        company={logFor}
        reasons={masters?.not_received_reasons ?? []}
      />
      <CallHistoryModal isOpen={historyFor !== null} onClose={() => setHistoryFor(null)} campaignId={campaignId} company={historyFor} />
      {!active && !isAdmin && (
        <p className="text-sm text-amber-700">This campaign is {campaign.status.toLowerCase()}, so calls cannot be logged right now.</p>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ admin ----

const AdminActions: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const update = useUpdateCampaign(campaign.campaign_id);
  const [error, setError] = useState<string | null>(null);

  const moveTo = (status: string) => {
    setError(null);
    update.mutate({ status }, { onError: (e) => setError(parseApiError(e).message) });
  };

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <div className="flex flex-wrap gap-2">
        {campaign.status === 'Draft' && (
          <button type="button" className={primaryBtn} onClick={() => moveTo('Active')} disabled={update.isPending}>
            <Play className="h-4 w-4" /> Activate
          </button>
        )}
        {campaign.status === 'Paused' && (
          <button type="button" className={primaryBtn} onClick={() => moveTo('Active')} disabled={update.isPending}>
            <Play className="h-4 w-4" /> Resume
          </button>
        )}
        {campaign.status === 'Active' && (
          <button type="button" className={secondaryBtn} onClick={() => moveTo('Paused')} disabled={update.isPending}>
            <Pause className="h-4 w-4" /> Pause
          </button>
        )}
        {(campaign.status === 'Active' || campaign.status === 'Paused') && (
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => window.confirm('Mark this campaign as completed? Calls and new companies are blocked once it is completed.') && moveTo('Completed')}
            disabled={update.isPending}
          >
            <CheckCheck className="h-4 w-4" /> Mark completed
          </button>
        )}
        {campaign.status === 'Completed' && (
          <button type="button" className={secondaryBtn} onClick={() => moveTo('Active')} disabled={update.isPending}>
            <Play className="h-4 w-4" /> Reopen
          </button>
        )}
        <Link to={`/sales/campaigns/${campaign.campaign_id}/edit`} className={secondaryBtn}>
          <Pencil className="h-4 w-4" /> Edit
        </Link>
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    </div>
  );
};

const AdminBody: React.FC<{
  detail: CampaignDetailAdmin;
  employees: { emp_id: number; name: string }[];
  onLogCall: (c: CampaignCompany) => void;
  onHistory: (c: CampaignCompany) => void;
}> = ({ detail, employees, onLogCall, onHistory }) => {
  const { campaign } = detail;
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'companies') as Tab;
  const [preset, setPreset] = useState<string | undefined>(undefined);
  const completed = campaign.status === 'Completed';
  const pending = campaign.total_companies - campaign.called_companies;

  const goTo = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  return (
    <>
      <section aria-label="Campaign summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Companies" value={campaign.total_companies} />
        <KpiCard label="Assigned" value={campaign.assigned_companies} />
        <KpiCard label="Not assigned" value={detail.unassigned_companies} tone={detail.unassigned_companies > 0 ? 'warn' : 'default'} />
        <KpiCard label="Called" value={campaign.called_companies} tone="good" />
        <KpiCard label="Pending calls" value={pending} />
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Campaign sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => goTo(t.id)}
            className={`h-9 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'companies' && (
        <CampaignCompaniesTable
          campaignId={campaign.campaign_id}
          isAdmin
          campaignActive={campaign.status === 'Active'}
          employees={employees}
          initialAssigned={preset}
          onLogCall={onLogCall}
          onHistory={onHistory}
        />
      )}
      {tab === 'add' && (
        <AddCompaniesPanel
          campaignId={campaign.campaign_id}
          disabled={completed}
          defaults={{ city: campaign.target_cities.length === 1 ? campaign.target_cities[0] : undefined, industry_id: campaign.industry_id, state: campaign.target_state }}
        />
      )}
      {tab === 'assign' && (
        <AssignPanel
          campaignId={campaign.campaign_id}
          disabled={completed}
          onShowUnassigned={() => {
            setPreset('unassigned');
            goTo('companies');
          }}
        />
      )}
    </>
  );
};

// --------------------------------------------------------------- employee ----

const EmployeeBody: React.FC<{
  campaign: Campaign;
  mine: MyCampaignStats;
  employees: { emp_id: number; name: string }[];
  onLogCall: (c: CampaignCompany) => void;
  onHistory: (c: CampaignCompany) => void;
}> = ({ campaign, mine, employees, onLogCall, onHistory }) => (
  <>
    <section aria-label="My progress" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      <KpiCard label="Assigned" value={mine.assigned} />
      <KpiCard label="Pending calls" value={mine.pending} tone="warn" />
      <KpiCard label="Called" value={mine.called} />
      <KpiCard label="Connected" value={mine.connected} />
      <KpiCard label="Not received" value={mine.not_received} />
      <KpiCard label="Interested" value={mine.interested} tone="good" />
      <KpiCard label="Follow-ups due" value={mine.follow_ups_due} tone="warn" />
      <KpiCard label="Meetings" value={mine.meetings_scheduled} />
    </section>

    <div className={`${cardCls} p-4`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-900">Today&apos;s calls</span>
        <span className="text-gray-600">{mine.calls_today} of {mine.daily_target}</span>
      </div>
      <ProgressBar done={mine.calls_today} total={mine.daily_target} className="mt-2" />
      {mine.daily_target === 0 && <p className="mt-1 text-xs text-gray-400">No daily target has been set for you in this campaign.</p>}
    </div>

    <CampaignCompaniesTable
      campaignId={campaign.campaign_id}
      isAdmin={false}
      campaignActive={campaign.status === 'Active'}
      employees={employees}
      onLogCall={onLogCall}
      onHistory={onHistory}
    />
  </>
);
