import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save, Search, Send } from 'lucide-react';
import { perfErrMessage, useSubmitReviewMutation, useTeamReviewsQuery } from '../hooks/use-performance';
import { Banner, PartBadge, ReviewQuestions, allRequiredDone, btn, fmtDate, inputCls } from './perf-ui';

/** BFD Screen 6: Team Review (Reporting Manager) — the Admin uses the same screen for all employees. */
export const TeamReviewTab: React.FC<{
  cycleId?: number;
  isAdmin: boolean;
  isManager: boolean;
  departments: Array<{ dep_id: number; name: string }>;
  focusEmpId?: number | null;
}> = ({ cycleId, isAdmin, isManager, departments, focusEmpId }) => {
  const [mode, setMode] = useState<'MANAGER' | 'ADMIN'>(isManager ? 'MANAGER' : 'ADMIN');
  const [depId, setDepId] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const { data, isLoading, error: loadError } = useTeamReviewsQuery(
    { cycle_id: cycleId, as: mode, department_id: mode === 'ADMIN' ? depId : undefined },
    Boolean(isAdmin || isManager),
  );
  const submit = useSubmitReviewMutation();

  useEffect(() => {
    if (focusEmpId && isAdmin) {
      setMode('ADMIN');
      setSelected(focusEmpId);
    }
  }, [focusEmpId, isAdmin]);

  const items = useMemo(
    () => (data?.items || []).filter((i) => !search.trim() || i.employee.name.toLowerCase().includes(search.trim().toLowerCase())),
    [data?.items, search],
  );
  const current = items.find((i) => i.employee.emp_id === selected) || items[0];

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setRatings(current?.mine.ratings || {});
    setAnswers(current?.mine.answers || {});
    setComment(current?.mine.comment || '');
    setError('');
  }, [current?.review_id, current?.mine.status, current?.mine.submitted_at, mode]);

  const save = async (isDraft: boolean) => {
    if (!current?.review_id) return;
    setError('');
    setNotice('');
    try {
      await submit.mutateAsync({ part: mode, reviewId: current.review_id, payload: { ratings, answers, comment, is_draft: isDraft } });
      setNotice(isDraft ? 'Draft saved.' : `Review for ${current.employee.name} is submitted.`);
    } catch (e) {
      setError(perfErrMessage(e));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && isManager && (
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            {(['MANAGER', 'ADMIN'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
              >
                {m === 'MANAGER' ? 'My team (Reporting Manager)' : 'All employees (Admin)'}
              </button>
            ))}
          </div>
        )}
        {mode === 'ADMIN' && (
          <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} className={`${inputCls} max-w-[200px]`}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.dep_id} value={d.dep_id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        {data?.counts && (
          <span className="text-xs text-slate-600">
            Done <strong>{data.counts.done}</strong> of {data.counts.total}
          </span>
        )}
      </div>

      {loadError && <Banner tone="error">{perfErrMessage(loadError)}</Banner>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-900">{mode === 'MANAGER' ? 'My team' : 'Employees'}</span>
            <span className="text-[11px] text-slate-500">{data?.cycle?.period_label}</span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee" className={`${inputCls} pl-8`} />
          </div>
          {isLoading && <p className="text-xs text-slate-400 px-1">Loading…</p>}
          {!isLoading && items.length === 0 && <p className="text-xs text-slate-400 px-1">Nobody to review in this cycle.</p>}
          {items.map((i) => (
            <button
              key={i.employee.emp_id}
              type="button"
              onClick={() => setSelected(i.employee.emp_id)}
              className={`w-full text-left p-2.5 rounded-xl border transition ${
                current?.employee.emp_id === i.employee.emp_id ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 truncate">{i.employee.name}</span>
                {i.done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label="Done" />}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <PartBadge status={i.self.status} prefix="Self" />
                {!i.has_manager && <span className="text-[10px] font-semibold text-red-600">No Reporting Manager</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          {!current ? (
            <p className="text-xs text-slate-400">Choose an employee.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {current.employee.name}{' '}
                    <span className="text-xs font-medium text-slate-500">
                      {current.employee.emp_code} | {current.employee.department_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {current.self.status === 'SUBMITTED' ? `Submitted on ${fmtDate(current.self.submitted_at)}. ` : 'Self review not submitted yet. '}
                    Your rating is separate; the employee cannot see it.
                  </p>
                </div>
                {current.self.status === 'SUBMITTED' && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Self review submitted
                  </span>
                )}
              </div>

              {!current.has_manager && mode === 'ADMIN' && (
                <Banner tone="warn">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  This employee has no Reporting Manager. Please set one in Employee Details.
                </Banner>
              )}
              {current.message && !current.done && <Banner tone={current.can_edit ? 'info' : 'warn'}>{current.message}</Banner>}
              {current.done && <Banner tone="ok">You have submitted this review. It is locked.</Banner>}
              {notice && <Banner tone="ok">{notice}</Banner>}
              {error && <Banner tone="error">{error}</Banner>}

              {current.questions.length > 0 ? (
                <ReviewQuestions
                  questions={current.questions}
                  ratings={ratings}
                  answers={answers}
                  comment={comment}
                  onRating={(id, v) => setRatings((p) => ({ ...p, [id]: v }))}
                  onAnswer={(id, v) => setAnswers((p) => ({ ...p, [id]: v }))}
                  onComment={setComment}
                  readOnly={!current.can_edit}
                  ratingsTitle={mode === 'MANAGER' ? 'Reporting Manager rating' : 'Admin rating'}
                  commentTitle="Your comment (optional)"
                  compare={{
                    label: "Employee's own rating",
                    ratings: current.self.ratings,
                    average: current.self.average,
                    comment: current.self.comment,
                    commentLabel: "Employee's comment",
                  }}
                />
              ) : (
                <p className="text-xs text-slate-500">No review form is available for this employee yet.</p>
              )}

              {current.can_edit && current.review_id && (
                <div className="flex justify-end gap-2">
                  <button type="button" className={btn.secondary} disabled={submit.isPending} onClick={() => save(true)}>
                    <Save className="w-3.5 h-3.5" /> Save Draft
                  </button>
                  <button
                    type="button"
                    className={btn.primary}
                    disabled={submit.isPending || !allRequiredDone(current.questions, ratings, answers)}
                    onClick={() => save(false)}
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Review
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
