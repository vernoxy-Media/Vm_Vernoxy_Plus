import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  BarChart3,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Pencil,
  Lock,
  UserX,
} from 'lucide-react';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { RowActionsMenu, SearchableSelect, type RowAction } from '@/shared/ui';
import { useAuth } from '@/features/auth/context/AuthContext';
import { parseApiError } from '@/shared/utils/api-error';
import {
  useCandidatesQuery,
  useUpdateCandidateStageMutation,
  type CandidateItem,
  type CandidateSortField,
} from '../hooks/use-recruitment';
import { useRoleOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { CandidateDecisionModal } from '../components/CandidateDecisionModal';
import { ConvertCandidateToEmployeeModal } from '../components/ConvertCandidateToEmployeeModal';
import { AddCandidateModal } from '../components/AddCandidateModal';
import { RecruitmentDashboardTab } from '../components/dashboard/RecruitmentDashboardTab';
import { decisionResultMessage, isPlainStage, isStageLocked, stageBadge } from '../utils/stages';

const AVATAR_COLORS = ['bg-amber-600', 'bg-emerald-600', 'bg-teal-600', 'bg-cyan-700', 'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-rose-600'];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Sortable columns and the way they sort first (dates newest first, text A–Z) */
const FIRST_DIRECTION: Record<CandidateSortField, 'asc' | 'desc'> = {
  candidate_code: 'desc',
  name: 'asc',
  position: 'asc',
  department: 'asc',
  experience: 'desc',
  source: 'asc',
  stage: 'asc',
  applied_date: 'desc',
};

export const CandidatesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.access?.can_manage_organization);
  const base = isAdmin ? '/admin/recruitment' : '/recruitment';

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = isAdmin && searchParams.get('tab') === 'dashboard' ? 'dashboard' : 'candidates';
  const setTab = (tab: 'candidates' | 'dashboard') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'dashboard') next.set('tab', 'dashboard');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('Open');
  const [sortField, setSortField] = useState<CandidateSortField>('applied_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Search waits for a short pause in typing, so each key press does not reload the list
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // A short success / error message at the top of the list
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const handleToggleSort = (field: CandidateSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(FIRST_DIRECTION[field]);
    }
    setCurrentPage(1);
  };

  // Stage menu
  const [activeStageMenuCandidateId, setActiveStageMenuCandidateId] = useState<number | null>(null);
  useEffect(() => {
    if (activeStageMenuCandidateId === null) return;
    const onClickOutside = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest('[data-stage-cell]')) return;
      e.stopPropagation();
      e.preventDefault();
      setActiveStageMenuCandidateId(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActiveStageMenuCandidateId(null);
    document.addEventListener('click', onClickOutside, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClickOutside, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [activeStageMenuCandidateId]);

  const [decisionCandidate, setDecisionCandidate] = useState<CandidateItem | null>(null);
  const [decisionInitialStage, setDecisionInitialStage] = useState<'selected' | 'on_hold' | 'rejected'>('selected');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [convertCandidate, setConvertCandidate] = useState<CandidateItem | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<CandidateItem | null>(null);

  // Data
  const { data: roles = [] } = useRoleOptionsQuery();
  const { data: sources = [] } = useLookupsQuery('candidate_source');
  const { data: stageLookups = [] } = useLookupsQuery('candidate_stage');
  const updateStageMutation = useUpdateCandidateStageMutation();

  const stageLabels = useMemo(() => new Map(stageLookups.map((s) => [s.code.toLowerCase(), s.label])), [stageLookups]);
  // The stages a candidate can be moved to straight away: the ones in Master Data, in their Master Data order
  const plainStages = useMemo(() => stageLookups.filter((s) => isPlainStage(s.code)), [stageLookups]);
  const sourceLabels = useMemo(() => new Map(sources.map((s) => [s.code, s.label])), [sources]);

  const handleStageChange = (cand: CandidateItem, targetStage: string) => {
    setActiveStageMenuCandidateId(null);
    if (targetStage === 'selected' || targetStage === 'on_hold' || targetStage === 'rejected') {
      setDecisionCandidate(cand);
      setDecisionInitialStage(targetStage);
      setIsDecisionModalOpen(true);
      return;
    }
    updateStageMutation.mutate(
      { candidateId: cand.candidate_id, stage: targetStage },
      {
        onSuccess: () => setFlash({ kind: 'success', text: `${cand.name} moved to ${stageBadge(targetStage, stageLabels).label}.` }),
        onError: (err) => setFlash({ kind: 'error', text: parseApiError(err, 'The stage could not be changed.').message }),
      },
    );
  };

  const {
    data: candidateData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useCandidatesQuery({
    q: debouncedSearch || undefined,
    roleId: roleFilter,
    source: sourceFilter || undefined,
    stage: stageFilter || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    sortBy: sortField,
    sortDir: sortDirection,
  });

  const candidates = candidateData?.items || [];
  const totalCount = candidateData?.total || 0;
  const stats = candidateData?.stats || { total: 0, interviewing: 0, selected: 0, onboarding: 0 };
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationRange = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    if (validCurrentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
    else if (validCurrentPage >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages);
    return pages;
  };

  const startIndex = totalCount > 0 ? (validCurrentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(validCurrentPage * pageSize, totalCount);

  const hasActiveFilters = Boolean(searchTerm.trim() || roleFilter !== undefined || sourceFilter || stageFilter !== 'Open');
  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter(undefined);
    setSourceFilter('');
    setStageFilter('Open');
    setCurrentPage(1);
  };

  const rowActions = (cand: CandidateItem): RowAction[] => {
    const actions: RowAction[] = [{ label: 'View', icon: Eye, onClick: () => navigate(`${base}/${cand.candidate_id}`) }];
    if (isAdmin) {
      actions.push({
        label: 'Edit',
        icon: Pencil,
        onClick: () => setEditCandidate(cand),
        disabled: Boolean(cand.converted_to_emp_id),
        hint: 'Already an employee: edit the employee profile instead',
      });
      // Converting is for a selected candidate who is not an employee yet
      if (!cand.converted_to_emp_id && cand.stage === 'selected') {
        actions.push({ label: 'Convert to Employee', icon: UserCheck, onClick: () => setConvertCandidate(cand) });
      }
    }
    return actions;
  };

  const SortHeader: React.FC<{ field: CandidateSortField; label: string; className?: string }> = ({ field, label, className = '' }) => (
    <th
      onClick={() => handleToggleSort(field)}
      aria-sort={sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`py-3.5 px-4 cursor-pointer hover:text-slate-800 select-none group whitespace-nowrap ${className}`}
      title={`Sort by ${label}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-slate-500 group-hover:text-slate-800">{label}</span>
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
        )}
      </div>
    </th>
  );

  const kpis = [
    { key: 'All', label: isAdmin ? 'Total Candidates' : 'Assigned to You', value: stats.total, note: isAdmin ? 'In recruitment database' : 'Your candidates', Icon: Users, tone: 'blue' },
    { key: 'interviewing', label: 'Interviewing', value: stats.interviewing, note: 'Active rounds', Icon: Clock, tone: 'amber' },
    { key: 'selected', label: 'Selected', value: stats.selected, note: 'Offer stage', Icon: Sparkles, tone: 'indigo' },
    { key: 'onboarding', label: 'Onboarding', value: stats.onboarding, note: 'Joining soon', Icon: UserCheck, tone: 'purple' },
  ] as const;
  const TONES: Record<string, { ring: string; text: string; icon: string }> = {
    blue: { ring: 'border-blue-500 bg-blue-50/15 ring-2 ring-blue-500/10', text: 'text-slate-900', icon: 'bg-blue-50 text-blue-600 border-blue-100/80' },
    amber: { ring: 'border-amber-500 bg-amber-50/15 ring-2 ring-amber-500/10', text: 'text-amber-600', icon: 'bg-amber-50 text-amber-600 border-amber-100/80' },
    indigo: { ring: 'border-indigo-500 bg-indigo-50/15 ring-2 ring-indigo-500/10', text: 'text-indigo-600', icon: 'bg-indigo-50 text-indigo-600 border-indigo-100/80' },
    purple: { ring: 'border-purple-500 bg-purple-50/20 ring-2 ring-purple-500/10', text: 'text-purple-600', icon: 'bg-purple-50 text-purple-600 border-purple-100/80' },
  };

  const stageFilterOptions = [
    { value: 'Open', label: 'Open (in pipeline)' },
    ...stageLookups.filter((s) => s.code.toLowerCase() !== 'open').map((s) => ({ value: s.code, label: s.label })),
    { value: 'All', label: 'All stages' },
  ];

  return (
    <AppLayout fluid>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {isAdmin ? (
            <div className="inline-flex items-center p-1 bg-white rounded-xl border border-slate-300 shadow-xs">
              {(['candidates', 'dashboard'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  id={`tab-${t}-btn`}
                  onClick={() => setTab(t)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
                    currentTab === t ? 'bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t === 'candidates' ? <Users className="w-4 h-4 stroke-[2]" /> : <BarChart3 className="w-4 h-4 stroke-[2]" />}
                  <span>{t === 'candidates' ? 'Candidates' : 'Dashboard'}</span>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Candidates</h1>
              <p className="text-xs text-slate-500 mt-0.5">Candidates the Admin assigned to you. Move them through the hiring stages.</p>
            </div>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAddCandidateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 text-sm cursor-pointer"
              id="add-candidate-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          )}
        </div>

        {flash && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
              flash.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {flash.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {flash.text}
            </span>
            <button type="button" onClick={() => setFlash(null)} className="rounded p-1 hover:bg-black/5" aria-label="Close message">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {currentTab === 'dashboard' ? (
          <RecruitmentDashboardTab />
        ) : (
          <>
            {/* KPI cards, each one a stage filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k) => {
                const active = stageFilter === k.key;
                return (
                  <div
                    key={k.key}
                    onClick={() => {
                      setStageFilter(active ? 'Open' : k.key);
                      setCurrentPage(1);
                    }}
                    className={`bg-white rounded-2xl p-5 border shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-slate-400 ${active ? TONES[k.tone].ring : 'border-slate-300'}`}
                    title={`Click to filter: ${k.label}`}
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{k.label}</p>
                      <h3 className={`text-2xl font-extrabold leading-tight ${TONES[k.tone].text}`}>{k.value}</h3>
                      <p className="text-[11px] font-medium text-slate-500 truncate">{k.note}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${TONES[k.tone].icon}`}>
                      <k.Icon className="w-6 h-6 stroke-[2]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-slate-300 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                <div className="lg:col-span-4 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search candidate name, ID, phone, email..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div className="lg:col-span-3">
                  <SearchableSelect
                    options={roles.map((r: any) => ({ value: r.role_id, label: r.role_name }))}
                    value={roleFilter}
                    onChange={(v) => {
                      setRoleFilter(v ? Number(v) : undefined);
                      setCurrentPage(1);
                    }}
                    placeholder="All Positions"
                    searchPlaceholder="Search position..."
                    clearable
                  />
                </div>
                <div className="lg:col-span-2">
                  <SearchableSelect
                    options={sources.map((s) => ({ value: s.code, label: s.label }))}
                    value={sourceFilter || undefined}
                    onChange={(v) => {
                      setSourceFilter(v ? String(v) : '');
                      setCurrentPage(1);
                    }}
                    placeholder="All Sources"
                    searchPlaceholder="Search source..."
                    clearable
                  />
                </div>
                <div className="lg:col-span-2">
                  <SearchableSelect
                    options={stageFilterOptions}
                    value={stageFilter}
                    onChange={(v) => {
                      setStageFilter(v ? String(v) : 'Open');
                      setCurrentPage(1);
                    }}
                    placeholder="Stage"
                    searchPlaceholder="Search stage..."
                  />
                </div>
                {hasActiveFilters && (
                  <div className="lg:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      title="Clear all filters"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Candidate table */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden flex flex-col">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm">Loading candidates...</p>
                </div>
              ) : isError ? (
                <div className="p-12 text-center text-rose-500 flex flex-col items-center justify-center gap-3">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm font-medium">Failed to load candidate list.</p>
                  <button type="button" onClick={() => refetch()} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition">
                    Retry
                  </button>
                </div>
              ) : candidates.length === 0 ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {hasActiveFilters ? 'No candidates match your search' : isAdmin ? 'No candidates yet' : 'No candidates assigned to you'}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    {hasActiveFilters
                      ? 'No candidates match your current filter criteria. Try clearing filters.'
                      : isAdmin
                        ? 'Start building your hiring pipeline by adding your first candidate.'
                        : 'When the Admin assigns a candidate to you, it appears here.'}
                  </p>
                  {hasActiveFilters ? (
                    <button type="button" id="empty-clear-filters-link" onClick={resetFilters} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer">
                      Clear filters
                    </button>
                  ) : (
                    isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAddCandidateModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add First Candidate</span>
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div className={`overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                  <table className="w-full min-w-[1080px] text-left border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <SortHeader field="candidate_code" label="CAN ID" />
                        <SortHeader field="name" label="Candidate" />
                        <SortHeader field="position" label="Position & Department" />
                        <SortHeader field="experience" label="Experience" />
                        <th className="py-3.5 px-4 whitespace-nowrap">Contact</th>
                        <SortHeader field="source" label="Source" />
                        <SortHeader field="stage" label="Stage" />
                        <SortHeader field="applied_date" label="Applied Date" />
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {candidates.map((cand) => {
                        const badge = stageBadge(cand.stage, stageLabels);
                        const locked = isStageLocked(cand);
                        const isFresher = cand.experience_type === 'fresher';
                        return (
                          <tr key={cand.candidate_id} onClick={() => navigate(`${base}/${cand.candidate_id}`)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                            {/* CAN ID */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">{cand.candidate_code}</span>
                            </td>

                            {/* Candidate */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm ${getAvatarBgColor(cand.name)}`}>
                                  {getInitials(cand.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[180px]">{cand.name}</div>
                                  {cand.assigned_to_name && <div className="text-[11px] text-slate-500 truncate max-w-[180px]">Assigned: {cand.assigned_to_name}</div>}
                                </div>
                              </div>
                            </td>

                            {/* Position & Department */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-900">{cand.role_name || `Role #${cand.role_id}`}</div>
                              <span className="mt-0.5 inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset ring-slate-200">
                                {cand.department_name || `Dept #${cand.dep_id}`}
                              </span>
                            </td>

                            {/* Experience */}
                            <td className="py-3.5 px-4">
                              {isFresher ? (
                                <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70">Fresher</span>
                              ) : (
                                <div>
                                  {Number(cand.exp_years || 0) === 0 && Number(cand.exp_months || 0) === 0 ? (
                                    <span className="text-sm text-slate-400">Not specified</span>
                                  ) : (
                                    <span className="font-medium text-slate-800 tabular-nums">
                                      {cand.exp_years}y {cand.exp_months}m
                                    </span>
                                  )}
                                  {cand.current_company && <p className="text-xs text-slate-500 truncate max-w-[160px]">{cand.current_company}</p>}
                                </div>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 text-xs font-mono tabular-nums">{cand.phone}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[180px]">{cand.email}</div>
                            </td>

                            {/* Source */}
                            <td className="py-3.5 px-4">
                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium ring-1 ring-inset ring-slate-200">
                                {sourceLabels.get(cand.source) ?? cand.source.replace(/_/g, ' ')}
                              </div>
                              {cand.referred_by_name && <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">Ref: {cand.referred_by_name}</p>}
                              {cand.source_portal && <p className="text-[11px] text-slate-500 mt-0.5 uppercase">{cand.source_portal}</p>}
                            </td>

                            {/* Stage: locked once the candidate is onboarding / an employee */}
                            <td data-stage-cell className="py-3.5 px-4 relative" onClick={(e) => e.stopPropagation()}>
                              {locked ? (
                                <span
                                  aria-disabled="true"
                                  title="The stage cannot be changed once onboarding has started"
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border opacity-80 cursor-not-allowed ${badge.bg}`}
                                >
                                  <span>{badge.label}</span>
                                  <Lock className="w-3 h-3 opacity-70" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveStageMenuCandidateId(activeStageMenuCandidateId === cand.candidate_id ? null : cand.candidate_id)}
                                  className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer hover:shadow-sm ${badge.bg}`}
                                  title="Click to change candidate stage"
                                  aria-haspopup="menu"
                                  aria-expanded={activeStageMenuCandidateId === cand.candidate_id}
                                >
                                  <span>{badge.label}</span>
                                  <ChevronDown className="w-3 h-3 opacity-70" />
                                </button>
                              )}

                              {!locked && activeStageMenuCandidateId === cand.candidate_id && (
                                <div role="menu" className="absolute left-4 top-10 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Stages</div>
                                  {plainStages.map((st) => (
                                    <button
                                      key={st.code}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => handleStageChange(cand, st.code)}
                                      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between ${
                                        cand.stage === st.code ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                                      }`}
                                    >
                                      <span>{st.label}</span>
                                      {cand.stage === st.code && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                                    </button>
                                  ))}
                                  {isAdmin && (
                                    <>
                                      <div className="border-t border-slate-100 my-1" />
                                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decision (Form)</div>
                                      <button type="button" role="menuitem" onClick={() => handleStageChange(cand, 'selected')} className="w-full text-left px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Selected</span>
                                      </button>
                                      <button type="button" role="menuitem" onClick={() => handleStageChange(cand, 'on_hold')} className="w-full text-left px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>On Hold</span>
                                      </button>
                                      <button type="button" role="menuitem" onClick={() => handleStageChange(cand, 'rejected')} className="w-full text-left px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition flex items-center gap-2">
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Rejected</span>
                                      </button>
                                      {cand.stage === 'selected' && (
                                        <>
                                          <button type="button" role="menuitem" onClick={() => handleStageChange(cand, 'did_not_join')} className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
                                            <UserX className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Did not join</span>
                                          </button>
                                          <div className="border-t border-slate-100 my-1" />
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                              setActiveStageMenuCandidateId(null);
                                              setConvertCandidate(cand);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 transition flex items-center gap-2"
                                          >
                                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Convert to Employee</span>
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Applied Date */}
                            <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap tabular-nums">{formatDate(cand.created_at)}</td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <RowActionsMenu actions={rowActions(cand)} label={`Actions for ${cand.name}`} id={`cand-actions-${cand.candidate_id}`} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalCount > 0 && (
                <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
                  <div>
                    Showing <span className="font-semibold text-slate-700">{startIndex}–{endIndex}</span> of <span className="font-semibold text-slate-700">{totalCount}</span> candidates
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      id="candidates-prev-page-btn"
                      disabled={validCurrentPage <= 1}
                      onClick={() => handlePageChange(Math.max(1, validCurrentPage - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2]" />
                    </button>
                    {getPaginationRange().map((pg, idx) =>
                      typeof pg === 'string' ? (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 font-medium text-xs select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => handlePageChange(pg)}
                          className={`w-8 h-8 rounded-lg font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                            pg === validCurrentPage ? 'bg-blue-600 text-white shadow-2xs' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pg}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      id="candidates-next-page-btn"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => handlePageChange(Math.min(totalPages, validCurrentPage + 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CandidateDecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        candidate={decisionCandidate}
        initialDecision={decisionInitialStage}
        onSuccess={(updated) => {
          refetch();
          setFlash(decisionResultMessage(updated));
        }}
      />

      <ConvertCandidateToEmployeeModal
        isOpen={Boolean(convertCandidate)}
        onClose={() => setConvertCandidate(null)}
        candidate={convertCandidate}
        onConverted={() => {
          const candId = convertCandidate?.candidate_id;
          setConvertCandidate(null);
          refetch();
          if (candId) navigate(`${base}/${candId}?tab=onboarding`);
        }}
      />

      <AddCandidateModal
        isOpen={isAddCandidateModalOpen || Boolean(editCandidate)}
        candidateToEdit={editCandidate}
        onClose={() => {
          setIsAddCandidateModalOpen(false);
          setEditCandidate(null);
        }}
        onSuccess={() => refetch()}
      />
    </AppLayout>
  );
};
