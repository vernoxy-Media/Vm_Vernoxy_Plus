import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  X,
  Loader2,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import {
  useCandidatesQuery,
  useUpdateCandidateStageMutation,
  CandidateItem,
} from '../hooks/use-recruitment';
import { useRoleOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { CandidateDecisionModal } from '../components/CandidateDecisionModal';
import { ConvertCandidateToEmployeeModal } from '../components/ConvertCandidateToEmployeeModal';
import { AddCandidateModal } from '../components/AddCandidateModal';

const AVATAR_COLORS = [
  'bg-amber-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-700',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-purple-600',
  'bg-rose-600',
];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getStageBadge(stage: string) {
  const s = (stage || '').toLowerCase();
  switch (s) {
    case 'open':
      return { label: 'Open', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'new':
      return { label: 'New', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'screening':
      return { label: 'Screening', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'interviewing':
      return { label: 'Interviewing', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'selected':
      return { label: 'Selected', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'onboarding':
      return { label: 'Onboarding', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'joined':
      return { label: 'Joined', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'did_not_join':
      return { label: 'Did not join', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'on_hold':
      return { label: 'On Hold', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
    default:
      return { label: stage, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const CandidatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('Open');
  const [sortField, setSortField] = useState<'candidate' | 'experience' | 'applied_date'>('applied_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleToggleSort = (field: 'candidate' | 'experience' | 'applied_date') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'applied_date' ? 'desc' : 'asc');
    }
  };

  // Stage Dropdown & Decision Modal state
  const [activeStageMenuCandidateId, setActiveStageMenuCandidateId] = useState<number | null>(null);
  const [decisionCandidate, setDecisionCandidate] = useState<CandidateItem | null>(null);
  const [decisionInitialStage, setDecisionInitialStage] = useState<'selected' | 'on_hold' | 'rejected'>('selected');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [convertCandidate, setConvertCandidate] = useState<CandidateItem | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);

  // Close floating stage menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveStageMenuCandidateId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Data fetching
  const { data: roles = [] } = useRoleOptionsQuery();
  const { data: sources = [] } = useLookupsQuery('candidate_source');
  const updateStageMutation = useUpdateCandidateStageMutation();

  const handleStageChange = (cand: CandidateItem, targetStage: string) => {
    setActiveStageMenuCandidateId(null);

    // Rule: Before Onboarding, candidate must be Selected first
    if (targetStage === 'onboarding') {
      if (cand.stage !== 'selected' && !cand.converted_to_emp_id) {
        setDecisionCandidate(cand);
        setDecisionInitialStage('selected');
        setIsDecisionModalOpen(true);
        return;
      }
      setConvertCandidate(cand);
      return;
    }

    if (targetStage === 'selected' || targetStage === 'on_hold' || targetStage === 'rejected') {
      setDecisionCandidate(cand);
      setDecisionInitialStage(targetStage as any);
      setIsDecisionModalOpen(true);
      return;
    }

    updateStageMutation.mutate({ candidateId: cand.candidate_id, stage: targetStage });
  };
  const {
    data: candidateData,
    isLoading,
    isError,
    refetch,
  } = useCandidatesQuery({
    q: searchTerm.trim() || undefined,
    roleId: roleFilter,
    source: sourceFilter || undefined,
    stage: stageFilter || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const candidates = candidateData?.items || [];
  const totalCount = candidateData?.total || 0;
  const stats = candidateData?.stats || {
    total: 0,
    interviewing: 0,
    selected: 0,
    onboarding: 0,
  };
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const sortedCandidates = useMemo(() => {
    const list = [...candidates];
    if (sortField === 'candidate') {
      list.sort((a, b) => {
        const res = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? res : -res;
      });
    } else if (sortField === 'experience') {
      list.sort((a, b) => {
        const expA = (a.exp_years || 0) * 12 + (a.exp_months || 0);
        const expB = (b.exp_years || 0) * 12 + (b.exp_months || 0);
        return sortDirection === 'asc' ? expA - expB : expB - expA;
      });
    } else if (sortField === 'applied_date') {
      list.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return sortDirection === 'asc' ? da - db : db - da;
      });
    }
    return list;
  }, [candidates, sortField, sortDirection]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || roleFilter !== undefined || sourceFilter || stageFilter !== 'Open',
  );

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter(undefined);
    setSourceFilter('');
    setStageFilter('Open');
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidates</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {totalCount} Total
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage your talent pipeline, candidate records, and onboarding workflow
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddCandidateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 text-sm cursor-pointer"
              id="add-candidate-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Candidates */}
          <div
            onClick={() => {
              setStageFilter(stageFilter === 'All' ? 'Open' : 'All');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl p-5 border shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-slate-400 ${
              stageFilter === 'All'
                ? 'border-blue-500 bg-blue-50/15 ring-2 ring-blue-500/10'
                : 'border-slate-300'
            }`}
            title="Click to view all candidates"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Candidates</p>
              <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.total}</h3>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                <span className="truncate">In recruitment database</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          {/* Interviewing */}
          <div
            onClick={() => {
              setStageFilter(stageFilter === 'interviewing' ? 'Open' : 'interviewing');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl p-5 border shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-slate-400 ${
              stageFilter === 'interviewing'
                ? 'border-amber-500 bg-amber-50/15 ring-2 ring-amber-500/10'
                : 'border-slate-300'
            }`}
            title="Click to filter by interviewing"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Interviewing</p>
              <h3 className="text-2xl font-extrabold text-amber-600 leading-tight">{stats.interviewing}</h3>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                <span className="truncate">Active rounds</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs">
              <Clock className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          {/* Selected */}
          <div
            onClick={() => {
              setStageFilter(stageFilter === 'selected' ? 'Open' : 'selected');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl p-5 border shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-slate-400 ${
              stageFilter === 'selected'
                ? 'border-indigo-500 bg-indigo-50/15 ring-2 ring-indigo-500/10'
                : 'border-slate-300'
            }`}
            title="Click to filter by selected"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Selected</p>
              <h3 className="text-2xl font-extrabold text-indigo-600 leading-tight">{stats.selected}</h3>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span className="truncate">Offer stage</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          {/* Onboarding */}
          <div
            onClick={() => {
              setStageFilter(stageFilter === 'onboarding' ? 'Open' : 'onboarding');
              setCurrentPage(1);
            }}
            className={`bg-white rounded-2xl p-5 border shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-slate-400 ${
              stageFilter === 'onboarding'
                ? 'border-emerald-500 bg-emerald-50/15 ring-2 ring-emerald-500/10'
                : 'border-slate-300'
            }`}
            title="Click to filter by onboarding"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Onboarding</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 leading-tight">{stats.onboarding}</h3>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">Joining soon</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
              <UserCheck className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-300 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
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
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 font-medium transition shadow-2xs"
              />
            </div>

            {/* Position Dropdown */}
            <div className="lg:col-span-3">
              <select
                value={roleFilter !== undefined ? String(roleFilter) : ''}
                onChange={(e) => {
                  setRoleFilter(e.target.value ? parseInt(e.target.value, 10) : undefined);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 font-bold shadow-2xs cursor-pointer"
              >
                <option value="">All Positions</option>
                {roles.map((r: any) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Dropdown */}
            <div className="lg:col-span-2">
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 font-bold shadow-2xs cursor-pointer"
              >
                <option value="">All Sources</option>
                {sources.map((s: any) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Dropdown */}
            <div className="lg:col-span-2">
              <select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 font-bold shadow-2xs cursor-pointer"
              >
                <option value="Open">Stage: Open</option>
                <option value="open">Open</option>
                <option value="new">New</option>
                <option value="screening">Screening</option>
                <option value="interviewing">Interviewing</option>
                <option value="on_hold">On Hold</option>
                <option value="selected">Selected</option>
                <option value="onboarding">Onboarding</option>
                <option value="joined">Joined</option>
                <option value="did_not_join">Did not join</option>
                <option value="rejected">Rejected</option>
                <option value="All">Stage: All</option>
              </select>
            </div>

            {/* Clear Filters */}
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

        {/* Candidate Table */}
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
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition"
              >
                Retry
              </button>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No candidates match your search</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {hasActiveFilters
                  ? 'No candidates match your current filter criteria. Try clearing filters.'
                  : 'Start building your hiring pipeline by adding your first candidate.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  id="empty-clear-filters-link"
                  onClick={resetFilters}
                  className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/admin/recruitment/new"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Candidate</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
              <table className="w-full min-w-[860px] text-left border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-300 text-xs sm:text-[13px] font-extrabold text-slate-900 uppercase tracking-wide shadow-2xs">
                  <tr>
                    <th
                      onClick={() => handleToggleSort('candidate')}
                      className="py-3 px-4 cursor-pointer hover:text-blue-600 select-none group"
                      title="Sort by Candidate Name"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 group-hover:text-blue-600">Candidate</span>
                        {sortField === 'candidate' ? (
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
                    <th className="py-3 px-4">Position & Dept</th>
                    <th
                      onClick={() => handleToggleSort('experience')}
                      className="py-3 px-4 cursor-pointer hover:text-blue-600 select-none group"
                      title="Sort by Experience"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 group-hover:text-blue-600">Experience</span>
                        {sortField === 'experience' ? (
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
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Stage</th>
                    <th
                      onClick={() => handleToggleSort('applied_date')}
                      className="py-3 px-4 cursor-pointer hover:text-blue-600 select-none group"
                      title="Sort by Applied Date"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 group-hover:text-blue-600">Applied Date</span>
                        {sortField === 'applied_date' ? (
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
                    <th className="py-3 px-4 text-right">Resume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCandidates.map((cand) => {
                    const badge = getStageBadge(cand.stage);
                    const isFresher = cand.experience_type === 'fresher';

                    return (
                      <tr
                        key={cand.candidate_id}
                        onClick={() => navigate(`/admin/recruitment/${cand.candidate_id}`)}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      >
                        {/* Candidate Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs shadow-xs ${getAvatarBgColor(
                                cand.name,
                              )}`}
                            >
                              {getInitials(cand.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {cand.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {cand.candidate_code}
                                </span>
                                {cand.converted_to_emp_id && (
                                  <>
                                    <span>•</span>
                                    <Link
                                      to={`/admin/recruitment/candidates/${cand.candidate_id}?tab=documents`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 rounded hover:bg-purple-100 transition inline-flex items-center gap-1"
                                      title="View Onboarding Documents"
                                    >
                                      <span>Onboarding Documents</span>
                                    </Link>
                                  </>
                                )}
                                {cand.current_location && (
                                  <>
                                    <span>•</span>
                                    <span>{cand.current_location}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Position & Department */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">
                            {cand.role_name || `Role #${cand.role_id}`}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                              {cand.department_name || `Dept #${cand.dep_id}`}
                            </span>
                          </div>
                        </td>

                        {/* Experience */}
                        <td className="py-3.5 px-4">
                          {isFresher ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Fresher
                            </span>
                          ) : (
                            <div>
                              <span className="font-medium text-slate-800">
                                {cand.exp_years}y {cand.exp_months}m
                              </span>
                              {cand.current_company && (
                                <p className="text-xs text-slate-500 truncate max-w-[160px]">
                                  {cand.current_company}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 text-xs font-mono">{cand.phone}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[180px]">
                            {cand.email}
                          </div>
                        </td>

                        {/* Source */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium capitalize">
                            <span>{cand.source.replace(/_/g, ' ')}</span>
                          </div>
                          {cand.referred_by_name && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                              Ref: {cand.referred_by_name}
                            </p>
                          )}
                          {cand.source_portal && (
                            <p className="text-[11px] text-slate-500 mt-0.5 uppercase">
                              {cand.source_portal}
                            </p>
                          )}
                        </td>

                        {/* Stage with Interactive Dropdown */}
                        <td
                          className="py-3.5 px-4 relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cand.converted_to_emp_id ? (
                            <Link
                              to={`/admin/recruitment/candidates/${cand.candidate_id}?tab=documents`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100 transition"
                              title="View Onboarding Documents"
                            >
                              <span>Onboarding</span>
                              <FileText className="w-3 h-3 text-purple-600" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveStageMenuCandidateId(
                                  activeStageMenuCandidateId === cand.candidate_id
                                    ? null
                                    : cand.candidate_id,
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition cursor-pointer hover:shadow-xs ${badge.bg}`}
                              title="Click to change candidate stage"
                            >
                              <span>{badge.label}</span>
                              <ChevronDown className="w-3 h-3 opacity-70" />
                            </button>
                          )}

                          {!cand.converted_to_emp_id && activeStageMenuCandidateId === cand.candidate_id && (
                            <div
                              className="absolute left-4 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Pipeline Stages
                              </div>
                              {['new', 'screening', 'interviewing', 'onboarding'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStageChange(cand, st)}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between capitalize ${
                                    cand.stage === st
                                      ? 'text-blue-600 font-semibold bg-blue-50/50'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <span>{st}</span>
                                  {st === 'onboarding' && cand.stage !== 'selected' && (
                                    <span className="text-[10px] text-amber-600 font-normal ml-auto mr-1">(Select first)</span>
                                  )}
                                  {cand.stage === st && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                  )}
                                </button>
                              ))}
                              <div className="border-t border-slate-100 my-1"></div>
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Decision (Form)
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStageChange(cand, 'selected')}
                                className="w-full text-left px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Selected</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStageChange(cand, 'on_hold')}
                                className="w-full text-left px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition flex items-center gap-2"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>On Hold</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStageChange(cand, 'rejected')}
                                className="w-full text-left px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition flex items-center gap-2"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Rejected</span>
                              </button>

                              {cand.stage === 'selected' && (
                                <>
                                  <div className="border-t border-slate-100 my-1"></div>
                                  <button
                                    type="button"
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
                            </div>
                          )}
                        </td>

                        {/* Applied Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(cand.created_at)}
                        </td>

                        {/* Resume Action */}
                        <td className="py-3.5 px-4 text-right">
                          {cand.resume_url ? (
                            <a
                              href={cand.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition"
                              title={cand.resume_filename || 'View Resume'}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalCount > pageSize && (
            <div className="p-4 border-t border-slate-300 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing <strong className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="font-bold text-slate-900">{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
                <strong className="font-bold text-slate-900">{totalCount}</strong> candidates
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition shadow-2xs font-bold"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2]" />
                </button>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-300 font-bold text-slate-800 shadow-2xs">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition shadow-2xs font-bold"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      <CandidateDecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        candidate={decisionCandidate}
        initialDecision={decisionInitialStage}
        onSuccess={() => refetch()}
      />

      {/* Convert Candidate to Employee Modal */}
      <ConvertCandidateToEmployeeModal
        isOpen={Boolean(convertCandidate)}
        onClose={() => setConvertCandidate(null)}
        candidate={convertCandidate}
        onConverted={() => {
          const candId = convertCandidate?.candidate_id;
          setConvertCandidate(null);
          refetch();
          if (candId) {
            navigate(`/admin/recruitment/candidates/${candId}?tab=documents`);
          }
        }}
      />

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={isAddCandidateModalOpen}
        onClose={() => setIsAddCandidateModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </AdminLayout>
  );
};

