import React, { useState, useEffect } from 'react';
import {
  X,
  Bug,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Send,
  Play,
  Check,
} from 'lucide-react';
import type { BugStatus, ProjectBugItem } from '../types';
import {
  fetchProjectBugDetail,
  updateProjectBugStatus,
  addProjectBugComment,
} from '../api/projects.api';

interface BugDetailsModalProps {
  projectId: number;
  bugId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onBugUpdated?: () => void;
}

const LIFECYCLE_STEPS: { status: BugStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'open', label: 'Open' },
  { status: 'ready_for_dev', label: 'Ready for Dev' },
  { status: 'dev_in_progress', label: 'Dev in Progress' },
  { status: 'ready_for_qa', label: 'Ready for QA' },
  { status: 'qa_in_progress', label: 'QA in Progress' },
  { status: 'done', label: 'Done' },
];

export const BugDetailsModal: React.FC<BugDetailsModalProps> = ({
  projectId,
  bugId,
  isOpen,
  onClose,
  onBugUpdated,
}) => {
  const [bug, setBug] = useState<ProjectBugItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

  const loadBug = async () => {
    if (!bugId) return;
    try {
      setIsLoading(true);
      const data = await fetchProjectBugDetail(projectId, bugId);
      setBug(data);
    } catch (err) {
      console.error('Failed to load bug details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bugId) {
      loadBug();
      setActiveTab('details');
      setStatusNote('');
    } else {
      setBug(null);
    }
  }, [isOpen, bugId]);

  if (!isOpen || !bugId) return null;

  const handleStatusTransition = async (newStatus: BugStatus, note?: string) => {
    try {
      setIsUpdatingStatus(true);
      const updated = await updateProjectBugStatus(projectId, bugId, newStatus, note || statusNote);
      setBug(updated);
      setStatusNote('');
      onBugUpdated?.();
    } catch (err: any) {
      console.error('Failed to update bug status:', err);
      alert(err?.detail || err?.message || 'Failed to update bug status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await addProjectBugComment(projectId, bugId, newComment.trim());
      setNewComment('');
      loadBug();
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      alert(err?.detail || err?.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const currentStepIdx = bug
    ? LIFECYCLE_STEPS.findIndex((s) => s.status === bug.status)
    : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                  {bug?.bug_code || `BUG-${bugId}`}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    bug?.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : bug?.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {bug?.priority || 'low'} priority
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {bug?.bug_type}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
                {bug?.title || 'Loading bug details...'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading || !bug ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-2" />
            Loading bug details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 3.6 Bug Lifecycle Progression Stepper */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Lifecycle Status: <strong className="text-slate-900">{bug.status.replace(/_/g, ' ').toUpperCase()}</strong>
                </span>
                {bug.status === 'not_a_bug' && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[10px] font-bold uppercase">
                    Closed: Not a Bug
                  </span>
                )}
              </div>

              {/* Progress Steps */}
              {bug.status !== 'not_a_bug' && (
                <div className="overflow-x-auto pb-1">
                  <div className="flex items-center min-w-[500px] justify-between">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const isCompleted = currentStepIdx > idx;
                      const isCurrent = currentStepIdx === idx;
                      return (
                        <React.Fragment key={step.status}>
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-rose-600 text-white ring-4 ring-rose-100 shadow-xs'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                            </div>
                            <span
                              className={`text-[10px] mt-1 whitespace-nowrap font-medium ${
                                isCurrent ? 'text-rose-600 font-bold' : 'text-slate-500'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {idx < LIFECYCLE_STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-1.5 transition-colors ${
                                isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lifecycle Actions */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">Advance bug workflow:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {bug.status === 'new' && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusTransition('open')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        Accept Bug (Open) <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusTransition('not_a_bug')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                      >
                        Mark as Not a Bug
                      </button>
                    </>
                  )}

                  {bug.status === 'open' && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusTransition('ready_for_dev')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        Ready for Dev <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusTransition('not_a_bug')}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-medium"
                      >
                        Not a Bug
                      </button>
                    </>
                  )}

                  {bug.status === 'ready_for_dev' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusTransition('dev_in_progress')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Dev (Dev in Progress)
                    </button>
                  )}

                  {bug.status === 'dev_in_progress' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusTransition('ready_for_qa')}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      Complete Dev (Ready for QA) <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {bug.status === 'ready_for_qa' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusTransition('qa_in_progress')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start QA Testing
                    </button>
                  )}

                  {bug.status === 'qa_in_progress' && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusTransition('done')}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        QA Passed (Done)
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusTransition('ready_for_dev', 'QA failed, returning to dev')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        QA Failed (Back to Dev)
                      </button>
                    </>
                  )}

                  {bug.status === 'done' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusTransition('ready_for_dev', 'Reopened by user')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen Bug
                    </button>
                  )}

                  {bug.status === 'not_a_bug' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusTransition('new', 'Re-evaluating')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                      Reopen as New Bug
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3.7 Time Tracking Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Dev Work Time
                </span>
                <div className="text-xs font-semibold text-slate-800">
                  {bug.dev_started_at ? (
                    <div>
                      <span>{formatDateTime(bug.dev_started_at)}</span>
                      {bug.dev_ended_at ? (
                        <span className="text-slate-500 block text-[10px]">
                          Finished: {formatDateTime(bug.dev_ended_at)}
                        </span>
                      ) : (
                        <span className="text-amber-600 block text-[10px] font-bold">● Active Now</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">Not started yet</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  QA Testing Time
                </span>
                <div className="text-xs font-semibold text-slate-800">
                  {bug.qa_started_at ? (
                    <div>
                      <span>{formatDateTime(bug.qa_started_at)}</span>
                      {bug.qa_ended_at ? (
                        <span className="text-slate-500 block text-[10px]">
                          Finished: {formatDateTime(bug.qa_ended_at)}
                        </span>
                      ) : (
                        <span className="text-indigo-600 block text-[10px] font-bold">● Active Now</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">Not started yet</span>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200/80">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Total Time Taken (Dev + QA)
                </span>
                <div className="text-base font-black text-blue-900">
                  {bug.total_time_minutes > 0 ? (
                    <>
                      {Math.floor(bug.total_time_minutes / 60)}h {bug.total_time_minutes % 60}m
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-blue-600">Pending calculation</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Details, Comments, History */}
            <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-2 border-b-2 transition ${
                  activeTab === 'details'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Bug Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`pb-2 border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Comments</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {bug.comments?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`pb-2 border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Status History</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  {bug.history?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB: Details */}
            {activeTab === 'details' && (
              <div className="space-y-4 text-xs">
                {/* Assignees & Reporter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {bug.assigned_to_name ? bug.assigned_to_name.substring(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Assigned To</span>
                      <span className="font-bold text-slate-800">{bug.assigned_to_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {bug.reported_by_name ? bug.reported_by_name.substring(0, 2).toUpperCase() : 'R'}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Reported By</span>
                      <span className="font-bold text-slate-800">{bug.reported_by_name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {formatDateTime(bug.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Description
                  </h4>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap">
                    {bug.description || 'No detailed description provided.'}
                  </div>
                </div>

                {/* Steps to Reproduce */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Steps to Reproduce
                  </h4>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap font-mono text-[11px]">
                    {bug.steps_to_reproduce || 'No steps provided.'}
                  </div>
                </div>

                {/* Expected & Actual Result */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Expected Result
                    </h4>
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-slate-700 whitespace-pre-wrap">
                      {bug.expected_result || '—'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Actual Result
                    </h4>
                    <div className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-xl text-slate-700 whitespace-pre-wrap">
                      {bug.actual_result || '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Comments */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {bug.comments && bug.comments.length > 0 ? (
                    bug.comments.map((comment) => (
                      <div
                        key={comment.comment_id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3 text-xs"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {comment.author_name ? comment.author_name.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{comment.author_name}</span>
                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      No comments yet on this bug.
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB: History */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {bug.history && bug.history.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {bug.history.map((h) => (
                      <div key={h.history_id} className="relative flex items-start gap-3 text-xs">
                        <div className="absolute -left-6 mt-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-4 ring-white" />
                        <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">{h.actor_name}</span>
                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(h.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            {h.from_status ? (
                              <>
                                <span className="capitalize">{h.from_status.replace(/_/g, ' ')}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                              </>
                            ) : null}
                            <span className="font-bold text-rose-600 capitalize">
                              {h.to_status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {h.note && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">
                              "{h.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    No history logged yet.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
