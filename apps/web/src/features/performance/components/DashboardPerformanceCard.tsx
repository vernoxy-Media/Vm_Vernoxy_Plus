import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMyPerfReviewQuery } from '../hooks/use-performance';
import { windowLabel } from './perf-ui';

/**
 * BFD Section 9 (Page 11):
 * "The employee sees the open review on the Dashboard and in Performance Review.
 * The screen shows how many days are left."
 */
export const DashboardPerformanceCard: React.FC = () => {
  const { data, isLoading } = useMyPerfReviewQuery();

  if (isLoading || !data?.cycle || !data.review || !data.form) {
    return null;
  }

  const { cycle, review } = data;
  const isOpen = cycle.status === 'REVIEW_OPEN';
  const isReopened = review.status === 'REOPENED';
  const isSubmitted = review.status === 'SUBMITTED';

  // Only display if the review is open or reopened, and not yet submitted
  if ((!isOpen && !isReopened) || isSubmitted) {
    return null;
  }

  const hasDraft = Object.keys(review.ratings || {}).length > 0 || Boolean(review.comment);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/70 p-5 sm:p-6 shadow-2xs transition-all hover:shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-blue-700 tracking-wide uppercase">
                {isReopened ? 'Action Required: Review Reopened' : 'Performance Review Open'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                {cycle.cycle_name}
              </span>
              {hasDraft && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Draft Saved
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {isReopened
                ? 'Your review has been opened again by Admin for updates'
                : 'Self Review window is currently active'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Review Window: {windowLabel(cycle.review_start_date, cycle.review_end_date)}
              </span>
              {cycle.days_left !== undefined && cycle.days_left !== null && (
                <span className="font-bold text-blue-700">
                  • Closes in {cycle.days_left} day{cycle.days_left === 1 ? '' : 's'}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="sm:self-center shrink-0">
          <Link
            to="/performance"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition cursor-pointer"
          >
            {hasDraft ? 'Continue Review' : 'Fill Review'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
