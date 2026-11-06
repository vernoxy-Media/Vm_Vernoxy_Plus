import React from 'react';
import { createPortal } from 'react-dom';
import { Lock, Star, X } from 'lucide-react';
import { StarRating } from './StarRating';
import type { CycleStatus, PerfQuestionItem, ReviewPartStatus } from '../hooks/use-performance';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

export function fmtDateTime(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

/** "01 Nov – 10 Nov 2026" */
export function windowLabel(start?: string, end?: string): string {
  if (!start || !end) return '—';
  const s = fmtDate(start);
  const e = fmtDate(end);
  return s.slice(-4) === e.slice(-4) ? `${s.slice(0, -5)} – ${e}` : `${s} – ${e}`;
}

export function one(n?: number | null): string {
  return n === null || n === undefined ? '—' : Number(n).toFixed(1);
}

export const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = { UPCOMING: 'Upcoming', REVIEW_OPEN: 'Review Open', CLOSED: 'Closed' };

export const CycleStatusBadge: React.FC<{ status: CycleStatus }> = ({ status }) => {
  const cls =
    status === 'REVIEW_OPEN'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : status === 'UPCOMING'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{CYCLE_STATUS_LABEL[status]}</span>;
};

export const PartBadge: React.FC<{ status: ReviewPartStatus; prefix?: string }> = ({ status, prefix }) => {
  const map: Record<ReviewPartStatus, [string, string]> = {
    SUBMITTED: ['Submitted', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    PENDING: ['Not yet', 'bg-amber-50 text-amber-700 border-amber-200'],
    REOPENED: ['Opened again', 'bg-violet-50 text-violet-700 border-violet-200'],
  };
  const [label, cls] = map[status] || map.PENDING;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {prefix ? `${prefix}: ` : ''}
      {label}
    </span>
  );
};

/** Read-only stars with the value, e.g. ★★★★☆ 4.0 */
export const StarsValue: React.FC<{ value: number | null | undefined; size?: number }> = ({ value, size = 13 }) => {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  const full = Math.round(Number(value));
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} style={{ width: size, height: size }} className={i <= full ? 'fill-amber-400 text-amber-500' : 'fill-slate-100 text-slate-300'} />
        ))}
      </span>
      <span className="font-bold text-slate-800">{one(value)}</span>
    </span>
  );
};

export const PerfModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }> = ({
  title,
  onClose,
  children,
  wide,
  footer,
}) =>
  createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );

export const ErrorNote: React.FC<{ text?: string | null }> = ({ text }) =>
  text ? <p className="text-[11px] text-red-600 font-medium mt-1">{text}</p> : null;

export const Banner: React.FC<{ tone?: 'info' | 'warn' | 'ok' | 'error'; children: React.ReactNode }> = ({ tone = 'info', children }) => {
  const cls = {
    info: 'bg-blue-50 border-blue-100 text-blue-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-700',
  }[tone];
  return <div className={`p-3 rounded-xl border text-xs ${cls}`}>{children}</div>;
};

export const btn = {
  primary:
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  secondary:
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  danger:
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer',
};

export const inputCls =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';

export const starQuestions = (qs: PerfQuestionItem[]) => qs.filter((q) => q.is_fixed || q.type === 'STAR_RATING');

/** Live average (one decimal) once every rating question has stars. */
export function liveAverage(qs: PerfQuestionItem[], ratings: Record<string, number>): number | null {
  const stars = starQuestions(qs);
  if (!stars.length || stars.some((q) => !ratings[q.id])) return null;
  return Math.round((stars.reduce((s, q) => s + Number(ratings[q.id]), 0) / stars.length) * 10) / 10;
}

export function allRequiredDone(qs: PerfQuestionItem[], ratings: Record<string, number>, answers: Record<string, any>): boolean {
  if (starQuestions(qs).some((q) => !ratings[q.id])) return false;
  return qs
    .filter((q) => !q.is_fixed && q.type !== 'STAR_RATING' && q.is_required)
    .every((q) => {
      const v = answers[q.id];
      return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null;
    });
}

/**
 * Renders the form: "Rate yourself"/ratings first, then the comment box,
 * then extra questions (BFD Screen 5 order). Optional "compare" column shows
 * the employee's own rating beside the reviewer's (Screen 6).
 */
export const ReviewQuestions: React.FC<{
  questions: PerfQuestionItem[];
  ratings: Record<string, number>;
  answers: Record<string, any>;
  comment: string;
  onRating: (id: string, v: number) => void;
  onAnswer: (id: string, v: any) => void;
  onComment: (v: string) => void;
  readOnly: boolean;
  ratingsTitle: string;
  commentTitle: string;
  compare?: { label: string; ratings: Record<string, number>; average: number | null; comment?: string | null; commentLabel?: string };
  yourLabel?: string;
}> = ({ questions, ratings, answers, comment, onRating, onAnswer, onComment, readOnly, ratingsTitle, commentTitle, compare, yourLabel = 'Your rating' }) => {
  const stars = starQuestions(questions);
  const extras = questions.filter((q) => !q.is_fixed && q.type !== 'STAR_RATING');
  const avg = liveAverage(questions, ratings);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">{ratingsTitle}</div>
        {compare && (
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <div className="col-span-12 sm:col-span-4">Rating question</div>
            <div className="hidden sm:block sm:col-span-3">{compare.label}</div>
            <div className="hidden sm:block sm:col-span-5">{yourLabel}</div>
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {stars.map((q) => (
            <div key={q.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3">
              <div className={compare ? 'col-span-12 sm:col-span-4' : 'col-span-12 sm:col-span-6'}>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  {q.title}
                  {q.is_fixed && <Lock className="w-3 h-3 text-slate-400" aria-label="Fixed question" />}
                </div>
                {q.description && <div className="text-[11px] text-slate-500">{q.description}</div>}
              </div>
              {compare && (
                <div className="col-span-12 sm:col-span-3">
                  <StarRating value={compare.ratings?.[q.id] || 0} readonly size={15} />
                </div>
              )}
              <div className={compare ? 'col-span-12 sm:col-span-5' : 'col-span-12 sm:col-span-6 sm:justify-self-end'}>
                <StarRating value={ratings[q.id] || 0} onChange={readOnly ? undefined : (v) => onRating(q.id, v)} readonly={readOnly} size={18} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 bg-slate-50/60 text-xs">
            <div className={compare ? 'col-span-12 sm:col-span-4 font-bold text-slate-700' : 'col-span-6 font-bold text-slate-700'}>Average</div>
            {compare && <div className="col-span-6 sm:col-span-3 font-semibold text-slate-700">{compare.average !== null ? one(compare.average) : '—'}</div>}
            <div className={compare ? 'col-span-6 sm:col-span-5 font-bold text-slate-900' : 'col-span-6 text-right font-bold text-slate-900'}>
              {avg !== null ? one(avg) : `${stars.filter((q) => ratings[q.id]).length} of ${stars.length} rated`}
            </div>
          </div>
        </div>
      </div>

      {compare?.commentLabel && (
        <div>
          <div className="text-xs font-bold text-slate-800 mb-1">{compare.commentLabel}</div>
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 whitespace-pre-wrap">{compare.comment || '—'}</div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-slate-800 mb-1 block">{commentTitle}</label>
        <textarea
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          disabled={readOnly}
          rows={3}
          maxLength={4000}
          className={inputCls}
          placeholder={readOnly ? '' : 'Write anything you want to add (optional)'}
        />
      </div>

      {extras.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="text-xs font-bold text-slate-800">Extra questions</div>
          {extras.map((q, i) => {
            const opts = q.options || [];
            const v = answers[q.id];
            return (
              <div key={q.id} className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-800">
                  {i + 1}. {q.title} {q.is_required && <span className="text-red-500">*</span>}
                </div>
                {q.description && <div className="text-[11px] text-slate-500">{q.description}</div>}
                {q.type === 'SHORT_ANSWER' && (
                  <input value={v || ''} onChange={(e) => onAnswer(q.id, e.target.value)} disabled={readOnly} className={inputCls} maxLength={2000} />
                )}
                {q.type === 'SINGLE_CHOICE' && (
                  <div className="flex flex-wrap gap-4">
                    {opts.map((o) => (
                      <label key={o.value} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <input type="radio" name={`q-${q.id}`} checked={v === o.value} onChange={() => onAnswer(q.id, o.value)} disabled={readOnly} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === 'MULTIPLE_CHOICE' && (
                  <div className="flex flex-wrap gap-4">
                    {opts.map((o) => {
                      const arr: string[] = Array.isArray(v) ? v : [];
                      return (
                        <label key={o.value} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={arr.includes(o.value)}
                            onChange={(e) => onAnswer(q.id, e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))}
                            disabled={readOnly}
                          />
                          {o.label}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
