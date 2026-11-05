import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock, Save, Send } from 'lucide-react';
import {
  MyReviewResponse,
  perfErrMessage,
  useSubmitReviewMutation,
} from '../hooks/use-performance';
import {
  Banner,
  CycleStatusBadge,
  ReviewQuestions,
  StarsValue,
  allRequiredDone,
  btn,
  fmtDateTime,
  starQuestions,
  windowLabel,
} from './perf-ui';

const TYPE_LABEL: Record<string, string> = { YEARLY: 'Yearly', QUARTERLY: 'Quarterly', MONTHLY: 'Monthly' };

/** BFD Screen 5: Employee Self Review. */
export const SelfReviewTab: React.FC<{ data?: MyReviewResponse; loading: boolean }> = ({ data, loading }) => {
  const submit = useSubmitReviewMutation();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const review = data?.review;
  useEffect(() => {
    setRatings(review?.ratings || {});
    setAnswers(review?.answers || {});
    setComment(review?.comment || '');
    setError('');
  }, [review?.review_id, review?.status, review?.submitted_at]);

  if (loading) return <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">Loading…</div>;
  if (!data?.cycle || !review || !data.form) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
        <Award className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">{data?.message || 'There is no review for you right now.'}</p>
      </div>
    );
  }

  const questions = data.form.questions;
  const stars = starQuestions(questions);
  const given = stars.filter((q) => ratings[q.id]).length;
  const canEdit = Boolean(data.can_edit);
  const ready = allRequiredDone(questions, ratings, answers);
  const cycle = data.cycle;

  const save = async (isDraft: boolean) => {
    setError('');
    setNotice('');
    try {
      await submit.mutateAsync({ part: 'SELF', reviewId: review.review_id, payload: { ratings, answers, comment, is_draft: isDraft } });
      setNotice(isDraft ? 'Draft saved.' : 'Your self review is submitted. Your Reporting Manager and Admin have been notified.');
      setConfirmOpen(false);
    } catch (e) {
      setError(perfErrMessage(e));
      setConfirmOpen(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{cycle.cycle_name}</h3>
              <CycleStatusBadge status={cycle.status} />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Window: {windowLabel(cycle.review_start_date, cycle.review_end_date)}
              {cycle.status === 'REVIEW_OPEN' && cycle.days_left ? ` • Closes in ${cycle.days_left} day${cycle.days_left === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-700">
              Ratings given: {given} of {stars.length}
            </div>
            <div className="text-[11px] text-slate-500">
              Status:{' '}
              {review.status === 'SUBMITTED'
                ? `Submitted ${fmtDateTime(review.submitted_at)}`
                : review.status === 'REOPENED'
                  ? 'Opened again by Admin'
                  : given > 0 || review.comment
                    ? 'Draft saved'
                    : 'Not started'}
            </div>
          </div>
        </div>

        {data.message && review.status !== 'SUBMITTED' && <Banner tone={canEdit ? 'info' : 'warn'}>{data.message}</Banner>}
        {review.reopened && review.reopened_reason && <Banner tone="info">Reason: {review.reopened_reason}</Banner>}
        {notice && <Banner tone="ok">{notice}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <ReviewQuestions
            questions={questions}
            ratings={ratings}
            answers={answers}
            comment={comment}
            onRating={(id, v) => setRatings((p) => ({ ...p, [id]: v }))}
            onAnswer={(id, v) => setAnswers((p) => ({ ...p, [id]: v }))}
            onComment={setComment}
            readOnly={!canEdit}
            ratingsTitle="Rate yourself"
            commentTitle="Your comment (optional)"
          />
          {canEdit && (
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" className={btn.secondary} disabled={submit.isPending} onClick={() => save(true)}>
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              <button
                type="button"
                className={btn.primary}
                disabled={submit.isPending || !ready}
                title={ready ? '' : 'Please give a star rating for every question before you submit.'}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="w-3.5 h-3.5" /> Submit Review
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
          <h4 className="text-xs font-bold text-slate-900">Review details</h4>
          <Detail label="Employee" value={`${data.details?.employee_name || ''} (${data.details?.emp_code || ''})`} />
          <Detail label="Department" value={data.details?.department_name || '—'} />
          <Detail label="Reporting Manager" value={data.details?.manager_name || 'Not set'} />
          <Detail label="Cycle type" value={TYPE_LABEL[cycle.cycle_type] || cycle.cycle_type} />
        </div>
        {review.status !== 'SUBMITTED' ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <div className="font-bold mb-1">After you submit</div>
            Your Reporting Manager and Admin get a notification. The review is then locked.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Submitted
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Your average</span>
              <StarsValue value={review.average} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Final Rating</span>
              {review.final_rating !== null ? <StarsValue value={review.final_rating} /> : <span className="text-amber-700 font-semibold">Pending</span>}
            </div>
            {data.project_avg_rating !== null && data.project_avg_rating !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600">Project rating</span>
                <StarsValue value={data.project_avg_rating} />
              </div>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Submit your self review?</h3>
            <p className="text-xs text-slate-600">After you submit, the review is locked. Only Admin can open it again.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn.secondary} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className={btn.primary} disabled={submit.isPending} onClick={() => save(false)}>
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-[11px] text-slate-500">{label}</div>
    <div className="font-semibold text-slate-800">{value}</div>
  </div>
);
