import React, { useState, useEffect } from 'react';
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
  Lock,
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Stage Dropdown & Decision Modal state
  const [activeStageMenuCandidateId, setActiveStageMenuCandidateId] = useState<number | null>(null);
  const [decisionCandidate, setDecisionCandidate] = useState<CandidateItem | null>(null);
  const [decisionInitialStage, setDecisionInitialStage] = useState<'selected' | 'on_hold' | 'rejected'>('selected');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [convertCandidate, setConvertCandidate] = useState<CandidateItem | null>(null);

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
            <Link
              to="/admin/recruitment/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 text-sm"
              id="add-candidate-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </Link>
          </div>
        </div>

        {/* 4 KPI Summary Cards matching Reference Screen 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Candidates */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Candidates</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                In recruitment database
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Interviewing */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Interviewing</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.interviewing}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Active rounds
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Selected */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Selected</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.selected}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Offer stage
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          {/* Onboarding */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Onboarding</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.onboarding}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Joining soon
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
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
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition"
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="Open">Stage: Open</option>
                <option value="All">Stage: All</option>
                <option value="new">New</option>
                <option value="screening">Screening</option>
                <option value="interviewing">Interviewing</option>
                <option value="selected">Selected</option>
                <option value="onboarding">Onboarding</option>
                <option value="rejected">Rejected</option>
                <option value="on_hold">On Hold</option>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
              <h3 className="text-base font-semibold text-slate-800">No candidates found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {hasActiveFilters
                  ? 'No candidates match your current filter criteria. Try clearing filters.'
                  : 'Start building your hiring pipeline by adding your first candidate.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                >
                  Clear Filters
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Position & Dept</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4 text-right">Resume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((cand) => {
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
                                      to={`/admin/employees/${cand.converted_to_emp_id}?tab=documents`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition inline-flex items-center gap-1"
                                      title="View Converted Employee Record"
                                    >
                                      <span>{cand.converted_to_emp_code || `EMP-${cand.converted_to_emp_id}`}</span>
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
                              to={`/admin/employees/${cand.converted_to_emp_id}?tab=documents`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition"
                              title="Converted to Employee (Onboarding)"
                            >
                              <span>Onboarding</span>
                              <Lock className="w-3 h-3 opacity-60" />
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
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} candidates
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
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
          setConvertCandidate(null);
          refetch();
        }}
      />
    </AdminLayout>
  );
};

