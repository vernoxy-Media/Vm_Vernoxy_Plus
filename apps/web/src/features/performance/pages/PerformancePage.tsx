import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  Users,
  FileText,
  Lock,
  RefreshCw,
  Sparkles,
  X,
  Send,
  Search,
  Briefcase,
  Save,
} from 'lucide-react';
import {
  usePerfCyclesQuery,
  useMyPerfReviewQuery,
  useSubmitSelfReviewMutation,
  usePerfReviewsQuery,
  useSubmitManagerReviewMutation,
  usePerfSummaryQuery,
  useAdminRatingMutation,
  useReopenReviewMutation,
  useMyProjectsQuery,
  useProjectMembersRatingQuery,
  useSubmitBulkProjectRatingsMutation,
  PerfReviewItem,
  PerfSummaryItem,
  PerfQuestionItem,
} from '../hooks/use-performance';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { StarRating } from '../components/StarRating';

const FIXED_QUESTIONS: PerfQuestionItem[] = [
  { id: 'q_comm', title: 'Communication', description: 'Evaluates clarity, responsiveness, and stakeholder interaction', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_behav', title: 'Behaviour', description: 'Evaluates professionalism, attitude, and work ethics', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_regul', title: 'Regularity', description: 'Evaluates punctuality, attendance, and adherence to company hours', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_teamw', title: 'Teamwork', description: 'Evaluates collaboration, peer support, and team contribution', type: 'STAR_RATING', is_fixed: true, required: true },
  { id: 'q_qualw', title: 'Quality of Work', description: 'Evaluates accuracy, diligence, and work output quality', type: 'STAR_RATING', is_fixed: true, required: true },
];

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();

  // Cycle selection
  const { data: cycles = [] } = usePerfCyclesQuery();
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);

  // Determine active cycle
  const currentCycle = selectedCycleId
    ? cycles.find((c) => c.cycle_id === selectedCycleId)
    : cycles.find((c) => c.status === 'REVIEW_OPEN') || cycles[0];

  const cycleIdToUse = currentCycle?.cycle_id;

  // -------------------------------------------------------------
  // TAB 1: MY EVALUATION (SELF-REVIEW)
  // -------------------------------------------------------------
  const { data: myData, isLoading: myLoading } = useMyPerfReviewQuery(cycleIdToUse);
  const submitSelfMut = useSubmitSelfReviewMutation();

  const isAdmin = Boolean(
    (myData as any)?.is_admin ||
    user?.access?.can_manage_organization ||
    user?.role?.role_name?.toLowerCase().includes('admin') ||
    user?.emp_id === 1
  );

  const isManager = Boolean(
    (myData as any)?.is_manager ||
    isAdmin
  );

  const canRateProjects = Boolean(
    (myData as any)?.can_rate_projects ||
    (myData as any)?.is_project_manager ||
    isAdmin
  );

  const { data: teamReviews = [], isLoading: teamLoading } = usePerfReviewsQuery(
    { cycle_id: cycleIdToUse },
    { enabled: isManager }
  );

  // Available tabs: MY_EVALUATION (everyone), TEAM_EVALUATION (managers/admin), PROJECT_RATING (PM/admin), ADMIN_SUMMARY (admin)
  const [activeTab, setActiveTab] = useState<'MY_EVALUATION' | 'TEAM_EVALUATION' | 'PROJECT_RATING' | 'ADMIN_SUMMARY'>('MY_EVALUATION');

  const [selfRatings, setSelfRatings] = useState<Record<string, number>>({});
  const [selfAnswers, setSelfAnswers] = useState<Record<string, any>>({});
  const [selfAchievements, setSelfAchievements] = useState('');
  const [selfImprovements, setSelfImprovements] = useState('');
  const [selfComments, setSelfComments] = useState('');
  const [selfError, setSelfError] = useState('');
  const [selfSuccess, setSelfSuccess] = useState(false);
  const [selfDraftSuccess, setSelfDraftSuccess] = useState(false);

  // Initialize self-ratings and answers from existing review
  React.useEffect(() => {
    if (myData?.review) {
      if (myData.review.self_ratings) {
        setSelfRatings(myData.review.self_ratings);
      }
      if (myData.review.self_answers) {
        setSelfAnswers(myData.review.self_answers);
      }
      const rawComments = myData.review.self_comments || (myData.review as any).self_comment || '';
      if (rawComments) {
        setSelfComments(rawComments);
      }
    }
  }, [myData?.review]);

  const questionsList: PerfQuestionItem[] =
    myData?.form?.questions && myData.form.questions.length > 0
      ? myData.form.questions
      : FIXED_QUESTIONS;

  const handleSelfRatingChange = (qId: string, val: number) => {
    setSelfRatings((prev) => ({ ...prev, [qId]: val }));
  };

  const calculateSelfAverage = () => {
    const ratings = Object.values(selfRatings);
    if (!ratings.length) return null;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const handleSaveSelfDraft = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setSelfError('');
    setSelfSuccess(false);
    setSelfDraftSuccess(false);

    if (!myData?.review) {
      setSelfError('Review record not available for this cycle.');
      return;
    }

    const combinedComments = [
      selfAchievements.trim() ? `Achievements:\n${selfAchievements.trim()}` : '',
      selfImprovements.trim() ? `Areas for Improvement:\n${selfImprovements.trim()}` : '',
      selfComments.trim() ? `General Comments:\n${selfComments.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      await submitSelfMut.mutateAsync({
        reviewId: myData.review.review_id,
        payload: {
          ratings: selfRatings,
          answers: selfAnswers,
          comments: combinedComments || selfComments,
          is_draft: true,
        },
      });
      setSelfDraftSuccess(true);
      setTimeout(() => setSelfDraftSuccess(false), 4000);
    } catch (err: any) {
      setSelfError(err?.message || 'Failed to save draft.');
    }
  };

  const handleSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError('');
    setSelfSuccess(false);
    setSelfDraftSuccess(false);

    if (!myData?.review) {
      setSelfError('Review record not available for this cycle.');
      return;
    }

    // Verify all required star rating questions are rated (1-5 stars)
    const starQuestions = questionsList.filter((q) => q.is_fixed || q.type === 'STAR_RATING');
    for (const q of starQuestions) {
      if (!selfRatings[q.id]) {
        setSelfError(`Please provide a star rating for "${q.title}".`);
        return;
      }
    }

    // Verify required extra questions (SHORT_ANSWER, SINGLE_CHOICE, MULTIPLE_CHOICE)
    const requiredExtra = questionsList.filter(
      (q) => !q.is_fixed && q.type !== 'STAR_RATING' && (q.required || (q as any).is_required)
    );
    for (const q of requiredExtra) {
      const ans = selfAnswers[q.id];
      if (!ans || (Array.isArray(ans) && ans.length === 0)) {
        setSelfError(`Please answer required question: "${q.title}".`);
        return;
      }
    }

    const combinedComments = [
      selfAchievements.trim() ? `Achievements:\n${selfAchievements.trim()}` : '',
      selfImprovements.trim() ? `Areas for Improvement:\n${selfImprovements.trim()}` : '',
      selfComments.trim() ? `General Comments:\n${selfComments.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      await submitSelfMut.mutateAsync({
        reviewId: myData.review.review_id,
        payload: {
          ratings: selfRatings,
          answers: selfAnswers,
          comments: combinedComments || selfComments,
          is_draft: false,
        },
      });
      setSelfSuccess(true);
    } catch (err: any) {
      setSelfError(err?.message || 'Failed to submit self-review.');
    }
  };

  // -------------------------------------------------------------
  // TAB 2: TEAM EVALUATION (MANAGER REVIEW)
  // -------------------------------------------------------------
  const submitManagerMut = useSubmitManagerReviewMutation();

  const [evaluatingReview, setEvaluatingReview] = useState<PerfReviewItem | null>(null);
  const [managerRatings, setManagerRatings] = useState<Record<string, number>>({});
  const [managerComments, setManagerComments] = useState('');
  const [managerError, setManagerError] = useState('');
  const [managerSuccess, setManagerSuccess] = useState(false);
  const [managerDraftSuccess, setManagerDraftSuccess] = useState(false);

  const openEvaluateModal = (review: PerfReviewItem) => {
    setEvaluatingReview(review);
    setManagerRatings(review.manager_ratings || review.self_ratings || {});
    setManagerComments(review.manager_comments || '');
    setManagerError('');
    setManagerSuccess(false);
    setManagerDraftSuccess(false);
  };

  const handleManagerSaveDraft = async () => {
    if (!evaluatingReview) return;
    setManagerError('');
    setManagerSuccess(false);
    setManagerDraftSuccess(false);

    try {
      await submitManagerMut.mutateAsync({
        reviewId: evaluatingReview.review_id,
        payload: {
          ratings: managerRatings,
          comments: managerComments.trim() || undefined,
          is_draft: true,
        },
      });
      setManagerDraftSuccess(true);
      setTimeout(() => setManagerDraftSuccess(false), 3000);
    } catch (err: any) {
      setManagerError(err?.message || 'Failed to save manager review draft.');
    }
  };

  const handleManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingReview) return;
    setManagerError('');

    const formQuestions = evaluatingReview.perf_forms?.questions?.length
      ? evaluatingReview.perf_forms.questions
      : FIXED_QUESTIONS;
    const requiredQuestions = formQuestions.filter((q) => q.is_fixed || q.type === 'STAR_RATING');

    for (const q of requiredQuestions) {
      if (!managerRatings[q.id]) {
        setManagerError(`Please provide a rating for "${q.title}".`);
        return;
      }
    }

    try {
      await submitManagerMut.mutateAsync({
        reviewId: evaluatingReview.review_id,
        payload: {
          ratings: managerRatings,
          comments: managerComments.trim() || undefined,
          is_draft: false,
        },
      });
      setManagerSuccess(true);
      setTimeout(() => {
        setEvaluatingReview(null);
      }, 1000);
    } catch (err: any) {
      setManagerError(err?.message || 'Failed to submit manager evaluation.');
    }
  };

  // -------------------------------------------------------------
  // TAB 4: PROJECT RATINGS (SCREEN 8 - PM / ADMIN)
  // -------------------------------------------------------------
  const { data: myProjects = [] } = useMyProjectsQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

  React.useEffect(() => {
    if (!selectedProjectId && myProjects.length > 0) {
      setSelectedProjectId(myProjects[0].project_id);
    }
  }, [myProjects, selectedProjectId]);

  const { data: projectMembersData, isLoading: membersLoading } = useProjectMembersRatingQuery(
    selectedProjectId,
    cycleIdToUse
  );
  const submitProjectRatingsMut = useSubmitBulkProjectRatingsMutation();

  const [projectMemberRatings, setProjectMemberRatings] = useState<Record<number, { rating: number; comment: string }>>({});
  const [projectRatingSuccess, setProjectRatingSuccess] = useState(false);
  const [projectRatingError, setProjectRatingError] = useState('');

  React.useEffect(() => {
    if (projectMembersData?.members) {
      const initial: Record<number, { rating: number; comment: string }> = {};
      for (const m of projectMembersData.members) {
        initial[m.emp_id] = {
          rating: m.rating || 0,
          comment: m.comment || '',
        };
      }
      setProjectMemberRatings(initial);
    }
  }, [projectMembersData]);

  const handleProjectMemberRatingChange = (empId: number, rating: number) => {
    setProjectMemberRatings((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { rating: 0, comment: '' }),
        rating,
      },
    }));
  };

  const handleProjectMemberCommentChange = (empId: number, comment: string) => {
    setProjectMemberRatings((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { rating: 0, comment: '' }),
        comment,
      },
    }));
  };

  const handleSaveProjectRatings = async (isDraft: boolean) => {
    if (!selectedProjectId || !cycleIdToUse) return;
    setProjectRatingError('');
    setProjectRatingSuccess(false);

    const members = projectMembersData?.members || [];
    if (members.length === 0) {
      setProjectRatingError('No team members found for this project.');
      return;
    }

    if (!isDraft) {
      for (const m of members) {
        const item = projectMemberRatings[m.emp_id];
        if (!item || !item.rating) {
          setProjectRatingError(`Please select a star rating (1-5) for ${m.name}.`);
          return;
        }
      }
    }

    const ratingsPayload = members.map((m) => {
      const item = projectMemberRatings[m.emp_id] || { rating: 0, comment: '' };
      return {
        emp_id: m.emp_id,
        rating: item.rating,
        comment: item.comment.trim() || undefined,
      };
    });

    try {
      await submitProjectRatingsMut.mutateAsync({
        project_id: selectedProjectId,
        cycle_id: cycleIdToUse,
        ratings: ratingsPayload,
      });
      setProjectRatingSuccess(true);
      setTimeout(() => setProjectRatingSuccess(false), 4000);
    } catch (err: any) {
      setProjectRatingError(err?.message || 'Failed to submit project ratings.');
    }
  };

  // -------------------------------------------------------------
  // TAB 3: ADMIN SUMMARY
  // -------------------------------------------------------------
  const { data: departments = [] } = useDepartmentOptionsQuery({ enabled: isAdmin });
  const [summaryDeptId, setSummaryDeptId] = useState<number | undefined>(undefined);
  const [summaryRatingFilter, setSummaryRatingFilter] = useState('');
  const [summarySearch, setSummarySearch] = useState('');

  const { data: summaryResult, isLoading: summaryLoading } = usePerfSummaryQuery(
    {
      cycle_id: cycleIdToUse,
      department_id: summaryDeptId,
      rating_filter: summaryRatingFilter,
      search: summarySearch || undefined,
    },
    { enabled: isAdmin }
  );

  const summaryItems = summaryResult?.items || [];
  const missingManagerEmployees = summaryResult?.missing_manager_employees || [];

  const adminRatingMut = useAdminRatingMutation();
  const reopenReviewMut = useReopenReviewMutation();

  // Admin Override Modal
  const [overrideItem, setOverrideItem] = useState<PerfSummaryItem | null>(null);
  const [adminRatingVal, setAdminRatingVal] = useState<number>(3);
  const [adminCommentsVal, setAdminCommentsVal] = useState('');
  const [adminOverrideError, setAdminOverrideError] = useState('');

  // Reopen Dialog
  const [reopenItem, setReopenItem] = useState<PerfSummaryItem | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  const handleSaveAdminRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideItem) return;
    setAdminOverrideError('');
    try {
      await adminRatingMut.mutateAsync({
        reviewId: overrideItem.review_id,
        payload: {
          final_rating: adminRatingVal,
          admin_comments: adminCommentsVal.trim() || undefined,
        },
      });
      setOverrideItem(null);
    } catch (err: any) {
      setAdminOverrideError(err?.message || 'Failed to update final rating.');
    }
  };

  const handleConfirmReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenItem) return;
    if (!reopenReason.trim()) {
      setReopenError('Please provide a reason for reopening this evaluation.');
      return;
    }
    setReopenError('');
    try {
      await reopenReviewMut.mutateAsync({
        reviewId: reopenItem.review_id,
        reason: reopenReason.trim(),
      });
      setReopenItem(null);
      setReopenReason('');
    } catch (err: any) {
      setReopenError(err?.message || 'Failed to reopen review.');
    }
  };

  // Review status badge formatting
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADMIN_APPROVED':
      case 'CLOSED':
        return { label: 'Closed / Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'MANAGER_REVIEWED':
        return { label: 'Manager Reviewed', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SELF_SUBMITTED':
        return { label: 'Self Submitted', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Self Review Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Cycle Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-blue-600" />
            <span>Performance Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official periodic evaluations, 5 core competencies, manager feedback, and rating summaries.
          </p>
        </div>

        {/* Active Cycle Selector */}
        <div className="flex items-center gap-3">
          {currentCycle && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Evaluation Cycle:</span>
              <select
                value={currentCycle.cycle_id}
                onChange={(e) => setSelectedCycleId(Number(e.target.value))}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {cycles.map((c) => (
                  <option key={c.cycle_id} value={c.cycle_id}>
                    {c.cycle_name || c.name || `Cycle #${c.cycle_id}`} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Cycle Banner */}
      {currentCycle && (
        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 rounded-2xl border border-blue-100/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {currentCycle.cycle_name || currentCycle.name || `Cycle #${currentCycle.cycle_id}`}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  currentCycle.status === 'REVIEW_OPEN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : currentCycle.status === 'UPCOMING'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {currentCycle.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Period: {currentCycle.start_date} &rarr; {currentCycle.end_date} &bull; Review Window: <strong>{currentCycle.review_start_date} to {currentCycle.review_end_date}</strong> (1st–10th)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentCycle.status === 'REVIEW_OPEN' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100/70 text-emerald-800 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Review Window Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium">
                <Lock className="w-3.5 h-3.5" />
                Review Window Closed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('MY_EVALUATION')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'MY_EVALUATION'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>My Evaluation</span>
          {myData?.review?.status && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
              {myData.review.status.replace('_', ' ')}
            </span>
          )}
        </button>

        {(isManager || isAdmin) && (
          <button
            type="button"
            onClick={() => setActiveTab('TEAM_EVALUATION')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'TEAM_EVALUATION'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Evaluations</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {teamReviews.length}
            </span>
          </button>
        )}

        {canRateProjects && (
          <button
            type="button"
            onClick={() => setActiveTab('PROJECT_RATING')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'PROJECT_RATING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Project Ratings</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('ADMIN_SUMMARY')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'ADMIN_SUMMARY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Admin Rating Summary</span>
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: MY EVALUATION                                                */}
      {/* =================================================================== */}
      {activeTab === 'MY_EVALUATION' && (
        <div className="space-y-6">
          {myLoading ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading evaluation...
            </div>
          ) : !myData?.review ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800">No Review Assigned</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active performance evaluation review was found for your account in this cycle.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form Questionnaire */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {myData.form?.form_name || 'Self-Review Questionnaire'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {myData.form?.description || 'Rate your performance on each parameter from 1 (Poor) to 5 (Excellent).'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(myData.review.status).cls}`}>
                        {getStatusBadge(myData.review.status).label}
                      </span>
                    </div>
                  </div>

                  {myData.review.reopened_at && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Review Reopened by Administrator</strong>
                        {myData.review.reopen_reason && (
                          <div className="mt-1 text-[11px] text-amber-700">Reason: {myData.review.reopen_reason}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {selfError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{selfError}</span>
                    </div>
                  )}

                  {selfDraftSuccess && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Self-review draft saved successfully. You can return anytime to make changes before submitting.</span>
                    </div>
                  )}

                  {selfSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Self-review successfully submitted!</span>
                    </div>
                  )}

                  {/* Questionnaire */}
                  <form onSubmit={handleSelfSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {questionsList.map((q, idx) => {
                        const isReadOnly =
                          myData.review?.is_locked ||
                          (myData.review?.status !== 'PENDING' && !myData.review?.reopened_at);
                        const currentRating = selfRatings[q.id] || 0;
                        const currentAnswer = selfAnswers[q.id];

                        let optionsList: { value: string; label: string }[] = [];
                        if (Array.isArray(q.options) && q.options.length > 0) {
                          optionsList = q.options.map((opt: any) =>
                            typeof opt === 'string'
                              ? { value: opt, label: opt }
                              : { value: opt.value || opt.label || '', label: opt.label || opt.value || '' }
                          );
                        } else if (q.description && (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE')) {
                          optionsList = q.description
                            .split(',')
                            .map((s) => ({ value: s.trim(), label: s.trim() }))
                            .filter((o) => o.value);
                        }
                        if (optionsList.length === 0 && (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE')) {
                          optionsList = [
                            { value: 'Bad', label: 'Bad' },
                            { value: 'Average', label: 'Average' },
                            { value: 'Good', label: 'Good' },
                            { value: 'Great', label: 'Great' },
                            { value: 'Excellent', label: 'Excellent' },
                          ];
                        }

                        const isStar = q.is_fixed || q.type === 'STAR_RATING';

                        return (
                          <div
                            key={q.id}
                            className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                  <span>{idx + 1}. {q.title}</span>
                                  {q.is_fixed && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" /> Core Fixed
                                    </span>
                                  )}
                                  {(q.required || (q as any).is_required) && !q.is_fixed && (
                                    <span className="text-[10px] font-bold text-rose-500">* Required</span>
                                  )}
                                </div>
                                {q.description && !optionsList.some((o) => o.label === q.description) && (
                                  <p className="text-[11px] text-slate-500">{q.description}</p>
                                )}
                              </div>

                              {isStar && (
                                <div className="shrink-0 pt-1 sm:pt-0">
                                  <StarRating
                                    value={currentRating}
                                    onChange={(v) => handleSelfRatingChange(q.id, v)}
                                    readonly={isReadOnly}
                                    size={24}
                                    showLabel
                                  />
                                </div>
                              )}
                            </div>

                            {!isStar && q.type === 'SHORT_ANSWER' && (
                              <div>
                                <textarea
                                  rows={2}
                                  disabled={isReadOnly}
                                  value={currentAnswer || ''}
                                  onChange={(e) =>
                                    setSelfAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  placeholder="Type your answer here..."
                                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
                                />
                              </div>
                            )}

                            {!isStar && q.type === 'SINGLE_CHOICE' && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {optionsList.map((opt) => (
                                  <label
                                    key={opt.value}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none flex items-center gap-1.5 ${
                                      currentAnswer === opt.value
                                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                    } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`q_${q.id}`}
                                      disabled={isReadOnly}
                                      checked={currentAnswer === opt.value}
                                      onChange={() =>
                                        setSelfAnswers((prev) => ({ ...prev, [q.id]: opt.value }))
                                      }
                                      className="sr-only"
                                    />
                                    <span>{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {!isStar && q.type === 'MULTIPLE_CHOICE' && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {optionsList.map((opt) => {
                                  const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none flex items-center gap-1.5 ${
                                        isChecked
                                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                      } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={isReadOnly}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentList = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
                                          if (e.target.checked) {
                                            setSelfAnswers((prev) => ({ ...prev, [q.id]: [...currentList, opt.value] }));
                                          } else {
                                            setSelfAnswers((prev) => ({
                                              ...prev,
                                              [q.id]: currentList.filter((item) => item !== opt.value),
                                            }));
                                          }
                                        }}
                                        className="sr-only"
                                      />
                                      <span>{opt.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Self Comments Section */}
                    <div className="space-y-4 border-t border-slate-100 pt-5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Qualitative Self-Assessment
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Key Achievements & Contributions
                        </label>
                        <textarea
                          rows={3}
                          disabled={myData.review.is_locked || (myData.review.status !== 'PENDING' && !myData.review.reopened_at)}
                          value={selfAchievements}
                          onChange={(e) => setSelfAchievements(e.target.value)}
                          placeholder="Highlight your key deliverables, milestone accomplishments, and impact during this period..."
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 resize-none disabled:bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Areas for Growth & Improvements
                        </label>
                        <textarea
                          rows={2}
                          disabled={myData.review.is_locked || (myData.review.status !== 'PENDING' && !myData.review.reopened_at)}
                          value={selfImprovements}
                          onChange={(e) => setSelfImprovements(e.target.value)}
                          placeholder="Skills or process areas you aim to strengthen..."
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 resize-none disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    {(!myData.review.is_locked && (myData.review.status === 'PENDING' || myData.review.reopened_at)) && (
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleSaveSelfDraft}
                          disabled={submitSelfMut.isPending}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors border border-slate-200 cursor-pointer"
                        >
                          <Save className="w-4 h-4 text-slate-500" />
                          <span>{submitSelfMut.isPending ? 'Saving...' : 'Save Draft'}</span>
                        </button>
                        <button
                          type="submit"
                          disabled={submitSelfMut.isPending}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>{submitSelfMut.isPending ? 'Submitting...' : 'Submit Self-Review'}</span>
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Right Column: Scorecard & Review Tracking */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                  <h3 className="font-bold text-slate-900 text-sm">Evaluation Scorecard</h3>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">Self-Rating Average</span>
                      <span className="text-base font-extrabold text-blue-600 font-mono">
                        {calculateSelfAverage() ? `${calculateSelfAverage()} ★` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-600 font-medium">Project Rating</span>
                        <p className="text-[10px] text-slate-400">Separate from Final formula</p>
                      </div>
                      <span className="text-base font-extrabold text-indigo-600 font-mono">
                        {myData?.project_avg_rating ? `${Number(myData.project_avg_rating).toFixed(1)} ★` : '—'}
                      </span>
                    </div>

                    {(isAdmin || isManager) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Manager Rating Average</span>
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          {(() => {
                            const ratings = myData.review.manager_ratings;
                            if (!ratings || typeof ratings !== 'object') return '—';
                            const values = Object.values(ratings) as number[];
                            if (values.length === 0) return '—';
                            return `${(values.reduce((a, b) => a + Number(b), 0) / values.length).toFixed(1)} ★`;
                          })()}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900">Final Official Rating</span>
                        <p className="text-[10px] text-slate-400 font-normal">(Self + Manager + Admin) / 3</p>
                      </div>
                      <span className="text-xl font-black text-amber-500 font-mono">
                        {myData.review.final_rating ? `${Number(myData.review.final_rating).toFixed(1)} ★` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Manager Feedback Note (visible to Manager & Admin only per BFD) */}
                  {(isAdmin || isManager) && myData.review.manager_comments && (
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Manager Feedback</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line mt-1">
                        {myData.review.manager_comments}
                      </p>
                    </div>
                  )}

                  {/* Administrative Note */}
                  {myData.review.admin_comments && (
                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                      <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Administrative Remarks</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line mt-1">
                        {myData.review.admin_comments}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: TEAM EVALUATIONS (MANAGER REVIEW)                            */}
      {/* =================================================================== */}
      {activeTab === 'TEAM_EVALUATION' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Direct Reports & Team Evaluations</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review employee self-evaluations and submit manager evaluations (1–5 whole stars).
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {teamReviews.length} Assigned
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4 text-center">Self Avg</th>
                  <th className="py-3 px-4 text-center">Manager Avg</th>
                  <th className="py-3 px-4 text-center">Final</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading team reviews...</td>
                  </tr>
                ) : teamReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No team members assigned for evaluation in this cycle.
                    </td>
                  </tr>
                ) : (
                  teamReviews.map((r) => {
                    const emp = r.employees_perf_reviews_emp_idToemployees;
                    const selfAvg = r.self_ratings
                      ? (
                          Object.values(r.self_ratings).reduce((a, b) => a + b, 0) /
                          Object.values(r.self_ratings).length
                        ).toFixed(1)
                      : null;

                    const mgrAvg = r.manager_ratings
                      ? (
                          Object.values(r.manager_ratings).reduce((a, b) => a + b, 0) /
                          Object.values(r.manager_ratings).length
                        ).toFixed(1)
                      : null;

                    return (
                      <tr key={r.review_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div>{emp?.name || `Employee #${r.emp_id}`}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{emp?.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <div>{emp?.departments?.name || 'Department Unassigned'}</div>
                          <div className="text-[11px] text-slate-400">{emp?.roles?.role_name || 'Role Unassigned'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                          {selfAvg || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">
                          {mgrAvg || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">
                          {r.final_rating ? Number(r.final_rating).toFixed(1) : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(r.status).cls}`}>
                            {getStatusBadge(r.status).label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEvaluateModal(r)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-semibold text-xs transition-colors"
                          >
                            {r.manager_submitted_at ? 'Review Evaluation' : 'Evaluate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ADMIN RATING SUMMARY                                         */}
      {/* =================================================================== */}
      {activeTab === 'ADMIN_SUMMARY' && isAdmin && (
        <div className="space-y-6">
          {/* Missing Reporting Manager Alert Banner (BFD Section 10 & 14) */}
          {missingManagerEmployees.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900">
                    Configuration Warning: {missingManagerEmployees.length} Employee{missingManagerEmployees.length > 1 ? 's' : ''} Missing Reporting Manager
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Pre-Review Window Check
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  According to Performance Management policy (BFD Section 10), manager reviews cannot be submitted for employees who do not have an assigned reporting manager. Please assign their reporting manager in the Employees directory before the review cycle begins.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {missingManagerEmployees.slice(0, 10).map((emp) => (
                    <span
                      key={emp.emp_id}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-100/90 text-amber-900 border border-amber-200"
                    >
                      {emp.name} <span className="text-amber-600 font-normal ml-1">({emp.department_name})</span>
                    </span>
                  ))}
                  {missingManagerEmployees.length > 10 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-200 text-amber-950">
                      +{missingManagerEmployees.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                placeholder="Search employee, email, code..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={summaryDeptId ?? ''}
                onChange={(e) => setSummaryDeptId(e.target.value ? Number(e.target.value) : undefined)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.dep_id} value={d.dep_id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={summaryRatingFilter}
                onChange={(e) => setSummaryRatingFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Ratings</option>
                <option value="EXCELLENT">4.0 – 5.0 (High)</option>
                <option value="GOOD">3.0 – 3.9 (Medium)</option>
                <option value="NEEDS_IMPROVEMENT">&lt; 3.0 (Low)</option>
              </select>
            </div>
          </div>

          {/* Organization Rating Matrix Table (Screen 7) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Designation</th>
                    <th className="py-3 px-4 text-center">Self Avg</th>
                    <th className="py-3 px-4 text-center">Manager Avg</th>
                    <th className="py-3 px-4 text-center">Project Avg</th>
                    <th className="py-3 px-4 text-center">Final Rating</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">Loading summary...</td>
                    </tr>
                  ) : summaryItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">No evaluations found matching criteria.</td>
                    </tr>
                  ) : (
                    summaryItems.map((item) => (
                      <tr key={item.review_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div>{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{item.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <div>{item.department_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-400">{item.designation}</span>
                            {item.has_missing_manager && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-700 font-semibold"
                                title="No reporting manager assigned to this employee"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                No Manager
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                          {item.self_avg !== null ? Number(item.self_avg).toFixed(1) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">
                          {item.manager_avg !== null ? Number(item.manager_avg).toFixed(1) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-600">
                          {item.project_avg !== null && item.project_avg !== undefined ? `${Number(item.project_avg).toFixed(1)} ★` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-amber-600 text-sm">
                          {item.final_rating !== null ? Number(item.final_rating).toFixed(1) : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status).cls}`}>
                            {getStatusBadge(item.status).label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOverrideItem(item);
                                setAdminRatingVal(item.final_rating ? Math.round(item.final_rating) : 3);
                                setAdminCommentsVal('');
                                setAdminOverrideError('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                              title="Override or Set Final Rating"
                            >
                              Set Rating
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setReopenItem(item);
                                setReopenReason('');
                                setReopenError('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                              title="Reopen Review for Employee / Manager"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PROJECT RATINGS (SCREEN 8 - PM / ADMIN)                      */}
      {/* =================================================================== */}
      {activeTab === 'PROJECT_RATING' && canRateProjects && (
        <div className="space-y-6">
          {/* Controls / Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Project Performance Evaluation</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rate project team members on project deliverables and execution. (Ratings shown separately from Core Rating).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">Project:</label>
              <select
                value={selectedProjectId ?? ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {myProjects.length === 0 ? (
                  <option value="">No managed projects found</option>
                ) : (
                  myProjects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name} ({p.project_no})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {projectRatingError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{projectRatingError}</span>
            </div>
          )}

          {projectRatingSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Project ratings saved and submitted successfully!</span>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Team Member</th>
                    <th className="py-3 px-4">Role in Project</th>
                    <th className="py-3 px-4 text-center w-64">1–5 Star Rating</th>
                    <th className="py-3 px-4">Remarks / Project Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">Loading project members...</td>
                    </tr>
                  ) : !projectMembersData?.members || projectMembersData.members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No team members currently assigned to this project.
                      </td>
                    </tr>
                  ) : (
                    projectMembersData.members.map((m) => {
                      const cur = projectMemberRatings[m.emp_id] || { rating: 0, comment: '' };
                      return (
                        <tr key={m.member_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div>{m.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{m.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {m.role_in_project}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center">
                              <StarRating
                                value={cur.rating}
                                onChange={(v) => handleProjectMemberRatingChange(m.emp_id, v)}
                                size={22}
                                showLabel
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              value={cur.comment}
                              onChange={(e) => handleProjectMemberCommentChange(m.emp_id, e.target.value)}
                              placeholder="Project deliverables, quality, responsiveness..."
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {projectMembersData?.members && projectMembersData.members.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveProjectRatings(true)}
                  disabled={submitProjectRatingsMut.isPending}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProjectRatings(false)}
                  disabled={submitProjectRatingsMut.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitProjectRatingsMut.isPending ? 'Submitting...' : 'Submit Project Ratings'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: MANAGER EVALUATION DIALOG                                   */}
      {/* ------------------------------------------------------------------ */}
      {evaluatingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Evaluate {evaluatingReview.employees_perf_reviews_emp_idToemployees?.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review self-ratings and assign manager scores (1–5 whole stars)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingReview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManagerSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
              {managerError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{managerError}</span>
                </div>
              )}

              {managerDraftSuccess && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Manager draft saved successfully!</span>
                </div>
              )}

              {managerSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Evaluation submitted successfully!</span>
                </div>
              )}

              {/* Employee Self-Comments Preview */}
              {evaluatingReview.self_comments && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Employee Self-Assessment Remarks</span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-line">
                    {evaluatingReview.self_comments}
                  </p>
                </div>
              )}

              {/* 5 Core Rating Questions */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Core Evaluation Parameters
                </h4>

                {(evaluatingReview.perf_forms?.questions?.length
                  ? evaluatingReview.perf_forms.questions
                  : FIXED_QUESTIONS
                ).map((q, idx) => {
                  const selfVal = evaluatingReview.self_ratings?.[q.id] || 0;
                  const mgrVal = managerRatings[q.id] || 0;
                  const isStar = q.is_fixed || q.type === 'STAR_RATING';
                  const empAnswer = evaluatingReview.self_answers?.[q.id];

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800">
                            {idx + 1}. {q.title}
                          </div>
                          {q.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{q.description}</p>
                          )}

                          {!isStar && empAnswer !== undefined && (
                            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                Employee Response:
                              </span>
                              <span className="text-slate-800 font-medium whitespace-pre-line">
                                {Array.isArray(empAnswer) ? empAnswer.join(', ') : String(empAnswer)}
                              </span>
                            </div>
                          )}
                        </div>

                        {isStar && (
                          <div className="flex items-center gap-4 shrink-0">
                            {selfVal > 0 && (
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-medium">Self-Rating</span>
                                <span className="text-xs font-bold text-slate-700 font-mono">
                                  {selfVal}.0 ★
                                </span>
                              </div>
                            )}

                            <div>
                              <span className="text-[10px] text-blue-600 block font-semibold">Manager Rating</span>
                              <StarRating
                                value={mgrVal}
                                onChange={(v) => setManagerRatings((prev) => ({ ...prev, [q.id]: v }))}
                                size={20}
                                showLabel
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Manager Feedback Comment */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-800">
                  Manager Feedback & Recommendations
                </label>
                <textarea
                  rows={3}
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  placeholder="Provide constructive feedback, observed strengths, and performance goals..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 resize-none"
                />
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEvaluatingReview(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManagerSaveDraft}
                  disabled={submitManagerMut.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="submit"
                  disabled={submitManagerMut.isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {submitManagerMut.isPending ? 'Submitting...' : 'Submit Manager Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADMIN RATING OVERRIDE                                       */}
      {/* ------------------------------------------------------------------ */}
      {overrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                Set Final Rating: {overrideItem.name}
              </h4>
              <button
                type="button"
                onClick={() => setOverrideItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminRating} className="pt-4 space-y-4">
              {adminOverrideError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {adminOverrideError}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Self Avg: </span>
                  <strong className="text-slate-800 font-mono">{overrideItem.self_avg ?? '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Manager Avg: </span>
                  <strong className="text-blue-600 font-mono">{overrideItem.manager_avg ?? '—'}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Official Final Star Rating
                </label>
                <StarRating
                  value={adminRatingVal}
                  onChange={(v) => setAdminRatingVal(v)}
                  size={26}
                  showLabel
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={adminCommentsVal}
                  onChange={(e) => setAdminCommentsVal(e.target.value)}
                  placeholder="Rationale or notes for final rating determination..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminRatingMut.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  {adminRatingMut.isPending ? 'Saving...' : 'Apply Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: REOPEN REVIEW DIALOG                                        */}
      {/* ------------------------------------------------------------------ */}
      {reopenItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Reopen Evaluation Review?
                </h4>
                <p className="text-xs text-slate-500">Unlocks evaluation for {reopenItem.name}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReopen} className="space-y-4">
              {reopenError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {reopenError}
                </div>
              )}

              <p className="text-xs text-slate-600">
                Reopening unlocks this review and sends it back to the employee / manager for revisions. An audit log entry will record this action.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reopen Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g., Requested revision of self-assessment milestones..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReopenItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopenReviewMut.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  {reopenReviewMut.isPending ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
