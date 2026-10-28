import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  User,
  Award,
} from 'lucide-react';
import { AdminLayout } from '../../../components/AdminLayout';
import {
  useCandidateDetailQuery,
  useUpdateCandidateStageMutation,
} from '../../../hooks/use-recruitment';
import { CandidateDecisionModal } from './CandidateDecisionModal';

export const CandidateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const candidateId = id ? parseInt(id, 10) : undefined;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'decision' | 'resume'>('overview');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionInitialStage, setDecisionInitialStage] = useState<'selected' | 'on_hold' | 'rejected'>('selected');
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);

  const { data: candidate, isLoading, error, refetch } = useCandidateDetailQuery(candidateId);
  const updateStageMutation = useUpdateCandidateStageMutation();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const getStageBadge = (stageCode: string) => {
    switch (stageCode?.toLowerCase()) {
      case 'new':
        return { label: 'New', bg: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' };
      case 'screening':
        return { label: 'Screening', bg: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' };
      case 'interviewing':
        return { label: 'Interviewing', bg: 'bg-purple-50 text-purple-700 border-purple-200/80', dot: 'bg-purple-500' };
      case 'selected':
        return { label: 'Selected', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
      case 'on_hold':
        return { label: 'On Hold', bg: 'bg-orange-50 text-orange-700 border-orange-200/80', dot: 'bg-orange-500' };
      case 'rejected':
        return { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };
      case 'onboarding':
        return { label: 'Onboarding', bg: 'bg-teal-50 text-teal-700 border-teal-200/80', dot: 'bg-teal-500' };
      default:
        return { label: stageCode || 'Unknown', bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const handleStageSelect = (targetStage: string) => {
    setIsStageMenuOpen(false);
    if (!candidateId) return;

    if (targetStage === 'selected' || targetStage === 'on_hold' || targetStage === 'rejected') {
      setDecisionInitialStage(targetStage as any);
      setIsDecisionModalOpen(true);
      return;
    }

    updateStageMutation.mutate(
      { candidateId, stage: targetStage },
      {
        onSuccess: () => refetch(),
      },
    );
  };

  if (isLoading) {
    return (
      <AdminLayout title="Candidate Profile" fluid>
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading candidate profile...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !candidate) {
    return (
      <AdminLayout title="Candidate Profile" fluid>
        <div className="py-20 text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Candidate Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            The candidate record does not exist or has been removed.
          </p>
          <Link
            to="/admin/recruitment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Candidates
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const badge = getStageBadge(candidate.stage);
  const isSelected = candidate.stage === 'selected';

  return (
    <AdminLayout title={`${candidate.name} - Candidate Profile`} fluid>
      <div className="space-y-6 pb-12">
        {/* Navigation Breadcrumb / Back button on Left */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/admin/recruitment')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Candidates</span>
          </button>
        </div>

        {/* Hero Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0 ring-4 ring-slate-100">
                {getInitials(candidate.name)}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{candidate.name}</h1>

                  {/* Stage Dropdown Badge */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsStageMenuOpen(!isStageMenuOpen)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border cursor-pointer hover:shadow-xs transition ${badge.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    </button>

                    {isStageMenuOpen && (
                      <div
                        className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pipeline Stages
                        </div>
                        {['new', 'screening', 'interviewing', 'onboarding'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStageSelect(st)}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between capitalize ${
                              candidate.stage === st ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                            }`}
                          >
                            <span>{st}</span>
                            {candidate.stage === st && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                        ))}
                        <div className="border-t border-slate-100 my-1"></div>
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Decisions (Form)
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStageSelect('selected')}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Selected</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStageSelect('on_hold')}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition flex items-center gap-2"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>On Hold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStageSelect('rejected')}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition flex items-center gap-2"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejected</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 font-medium">
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                    {candidate.candidate_code}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-800 font-medium flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {candidate.role_name}
                  </span>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 text-xs font-medium">
                    <Building2 className="w-3 h-3 text-blue-500" />
                    {candidate.department_name}
                  </span>
                  {candidate.current_location && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {candidate.current_location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {candidate.resume_url && (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Resume</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setDecisionInitialStage('selected');
                  setIsDecisionModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Mark Decision</span>
              </button>

              {isSelected && (
                <button
                  type="button"
                  onClick={() => {
                    navigate(
                      `/admin/employees/new?candidate_id=${candidate.candidate_id}&name=${encodeURIComponent(
                        candidate.name,
                      )}&email=${encodeURIComponent(candidate.email)}&phone=${encodeURIComponent(
                        candidate.phone,
                      )}&role_id=${candidate.final_role_id || candidate.role_id}&dep_id=${
                        candidate.final_dep_id || candidate.dep_id
                      }&ctc=${candidate.offered_ctc || ''}`,
                    );
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Convert to Employee</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('decision')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'decision'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Decision & Offer</span>
            {(candidate.decision_date || candidate.rejection_reason || candidate.on_hold_review_date) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resume')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'resume'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Resume & Files</span>
            {candidate.resume_url && (
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] text-slate-600">1</span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1 & 2: Main Info Cards */}
            <div className="md:col-span-2 space-y-6">
              {/* Professional Experience */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Experience & Compensation</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Experience Type</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {candidate.experience_type}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Total Experience</span>
                    <span className="font-semibold text-slate-800">
                      {candidate.experience_type === 'fresher'
                        ? 'Fresher'
                        : `${candidate.exp_years} Years ${candidate.exp_months} Months`}
                    </span>
                  </div>

                  {candidate.current_company && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Current Company</span>
                      <span className="font-semibold text-slate-800">{candidate.current_company}</span>
                    </div>
                  )}

                  {candidate.current_designation && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Current Designation</span>
                      <span className="font-semibold text-slate-800">{candidate.current_designation}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block mb-0.5">Current CTC</span>
                    <span className="font-semibold text-slate-800">
                      {candidate.current_ctc
                        ? `₹ ${Number(candidate.current_ctc).toLocaleString('en-IN')} / year`
                        : 'Not specified'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Expected CTC</span>
                    <span className="font-semibold text-slate-800">
                      {candidate.expected_ctc
                        ? `₹ ${Number(candidate.expected_ctc).toLocaleString('en-IN')} / year`
                        : 'Not specified'}
                    </span>
                  </div>

                  {candidate.notice_period && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Notice Period</span>
                      <span className="font-semibold text-slate-800 capitalize">
                        {candidate.notice_period.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {candidate.serving_notice_lwd && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Last Working Day</span>
                      <span className="font-semibold text-slate-800">
                        {candidate.serving_notice_lwd.split('T')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Skills */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Award className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Key Skills</h3>
                </div>

                {candidate.key_skills && candidate.key_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {candidate.key_skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific skills tagged.</p>
                )}
              </div>

              {/* Source & Referral */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Candidate Source & Attribution</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Source Type</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {candidate.source.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {candidate.source_portal && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Job Portal</span>
                      <span className="font-semibold text-slate-800 uppercase">
                        {candidate.source_portal}
                      </span>
                    </div>
                  )}

                  {candidate.referred_by_name && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Referred By</span>
                      <span className="font-semibold text-blue-600">
                        {candidate.referred_by_name}
                      </span>
                    </div>
                  )}

                  {candidate.consultancy_name && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Consultancy</span>
                      <span className="font-semibold text-slate-800">
                        {candidate.consultancy_name}
                      </span>
                    </div>
                  )}

                  {candidate.college_name && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">College / Campus</span>
                      <span className="font-semibold text-slate-800">
                        {candidate.college_name}
                      </span>
                    </div>
                  )}

                  {candidate.source_details && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block mb-0.5">Details</span>
                      <span className="font-semibold text-slate-800">
                        {candidate.source_details}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Contact & Meta */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Contact Information
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone</span>
                      <a
                        href={`tel:${candidate.phone}`}
                        className="font-semibold text-slate-800 hover:text-blue-600 transition font-mono"
                      >
                        {candidate.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[11px]">Email</span>
                      <a
                        href={`mailto:${candidate.email}`}
                        className="font-semibold text-slate-800 hover:text-blue-600 transition truncate block"
                      >
                        {candidate.email}
                      </a>
                    </div>
                  </div>

                  {candidate.current_location && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Location</span>
                        <span className="font-semibold text-slate-800">
                          {candidate.current_location}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Created At</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Notes */}
              {candidate.notes && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Candidate Notes
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {candidate.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Decision & Offer Details */}
        {activeTab === 'decision' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-8 space-y-6 max-w-4xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Final Hiring Decision</h3>
                  <p className="text-xs text-slate-500">Record and status of the decision made by the administrator</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDecisionInitialStage(
                    candidate.stage === 'selected' || candidate.stage === 'on_hold' || candidate.stage === 'rejected'
                      ? (candidate.stage as any)
                      : 'selected',
                  );
                  setIsDecisionModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
              >
                Update Decision
              </button>
            </div>

            {candidate.stage === 'selected' ? (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-sm">Candidate is Selected</h4>
                      <p className="text-xs text-emerald-700">Official offer details recorded.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(
                        `/admin/employees/new?candidate_id=${candidate.candidate_id}&name=${encodeURIComponent(
                          candidate.name,
                        )}&email=${encodeURIComponent(candidate.email)}&phone=${encodeURIComponent(
                          candidate.phone,
                        )}&role_id=${candidate.final_role_id || candidate.role_id}&dep_id=${
                          candidate.final_dep_id || candidate.dep_id
                        }&ctc=${candidate.offered_ctc || ''}`,
                      );
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Convert to Employee</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Final Designation</span>
                    <span className="font-bold text-sm text-slate-800">
                      {candidate.final_role_name || candidate.role_name}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Department</span>
                    <span className="font-bold text-sm text-slate-800">
                      {candidate.final_department_name || candidate.department_name}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Offered CTC</span>
                    <span className="font-bold text-sm text-emerald-600">
                      {candidate.offered_ctc
                        ? `₹ ${Number(candidate.offered_ctc).toLocaleString('en-IN')} / year`
                        : 'Not specified'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Expected Joining Date</span>
                    <span className="font-bold text-sm text-slate-800">
                      {candidate.expected_joining_date ? candidate.expected_joining_date.split('T')[0] : 'Pending'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Reporting Manager</span>
                    <span className="font-bold text-sm text-slate-800">
                      {candidate.reporting_manager_name || 'None assigned'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Employment Type</span>
                    <span className="font-bold text-sm text-slate-800">
                      {candidate.employment_type || 'Full-time'}
                    </span>
                  </div>
                </div>

                {candidate.decision_notes && (
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1 text-xs">Decision Notes</span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {candidate.decision_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : candidate.stage === 'on_hold' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="font-bold text-sm">Candidate is On Hold</h4>
                    <p className="text-xs text-amber-700">Profile held for subsequent review.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {candidate.on_hold_review_date && (
                    <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                      <span className="text-slate-400 block mb-1">Review Date</span>
                      <span className="font-bold text-sm text-slate-800">
                        {candidate.on_hold_review_date.split('T')[0]}
                      </span>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400 block mb-1">Hold Notes</span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {candidate.on_hold_notes || candidate.decision_notes || 'No hold notes recorded.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : candidate.stage === 'rejected' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-800 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <div>
                    <h4 className="font-bold text-sm">Candidate has been Rejected</h4>
                    <p className="text-xs text-rose-700">Archived for future reference.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Rejection Reason</span>
                    <span className="font-bold text-sm text-slate-800 capitalize">
                      {candidate.rejection_reason?.replace(/_/g, ' ') || 'Other'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Regret Email</span>
                    <span className="font-bold text-sm text-slate-800">
                      {candidate.send_regret_email ? 'Sent to candidate' : 'Not sent'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400 block mb-1">Rejection Feedback / Notes</span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {candidate.rejection_notes || candidate.decision_notes || 'No rejection notes recorded.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-700">No Final Decision Made Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Candidate is currently in <strong>{badge.label}</strong> stage. Click 'Mark Decision' to record selection, hold, or rejection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDecisionInitialStage('selected');
                    setIsDecisionModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mark Decision Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Resume & Files */}
        {activeTab === 'resume' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-8 space-y-6 max-w-4xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Candidate Resume</h3>
                <p className="text-xs text-slate-500">Document submitted with application</p>
              </div>
            </div>

            {candidate.resume_url ? (
              <div className="border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 bg-slate-50/40 hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    PDF
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      {candidate.resume_filename || 'Candidate_Resume.pdf'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Uploaded on {new Date(candidate.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View / Download</span>
                </a>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No resume file was attached for this candidate.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      <CandidateDecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        candidate={candidate}
        initialDecision={decisionInitialStage}
        onSuccess={() => refetch()}
      />
    </AdminLayout>
  );
};
