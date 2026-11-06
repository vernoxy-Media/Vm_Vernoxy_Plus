import React, { useMemo, useState } from 'react';
import { Award, Briefcase, ClipboardList, Star, Users } from 'lucide-react';
import { useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useMyPerfReviewQuery, usePerfCyclesQuery } from '../hooks/use-performance';
import { CYCLE_STATUS_LABEL, CycleStatusBadge, windowLabel } from '../components/perf-ui';
import { SelfReviewTab } from '../components/SelfReviewTab';
import { TeamReviewTab } from '../components/TeamReviewTab';
import { RatingSummaryTab } from '../components/RatingSummaryTab';
import { ProjectRatingTab } from '../components/ProjectRatingTab';

type Tab = 'SELF' | 'TEAM' | 'PROJECT' | 'SUMMARY';

/** Performance Review: Self Review, Team Review, Project Rating and Rating Summary (BFD Screens 5–8). */
export const PerformancePage: React.FC = () => {
  const [cycleId, setCycleId] = useState<number | undefined>();
  const { data: cycles = [] } = usePerfCyclesQuery();
  const { data: my, isLoading } = useMyPerfReviewQuery(cycleId);
  const activeCycleId = cycleId ?? my?.cycle?.cycle_id;
  const isAdmin = Boolean(my?.is_admin);
  const isManager = Boolean(my?.is_manager);
  const isPM = Boolean(my?.is_project_manager);
  const { data: departments = [] } = useDepartmentOptionsQuery({ enabled: isAdmin });

  const tabs = useMemo(() => {
    const list: Array<{ id: Tab; label: string; icon: React.ElementType }> = [{ id: 'SELF', label: 'Self Review', icon: Star }];
    if (isManager || isAdmin) list.push({ id: 'TEAM', label: 'Team Review', icon: Users });
    if (isPM) list.push({ id: 'PROJECT', label: 'Project Rating', icon: Briefcase });
    if (isAdmin) list.push({ id: 'SUMMARY', label: 'Rating Summary', icon: ClipboardList });
    return list;
  }, [isAdmin, isManager, isPM]);
  const [tab, setTab] = useState<Tab>('SELF');
  const [focusEmp, setFocusEmp] = useState<number | null>(null);
  const current = tabs.some((t) => t.id === tab) ? tab : 'SELF';
  const cycle = my?.cycle;

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-blue-600" /> Performance Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Star ratings from the employee, the Reporting Manager and the Admin, and the Final Rating.</p>
        </div>
        {cycles.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cycle</label>
            <select
              value={activeCycleId ?? ''}
              onChange={(e) => setCycleId(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 min-w-[240px]"
            >
              {cycles.map((c) => (
                <option key={c.cycle_id} value={c.cycle_id}>
                  {c.cycle_name} ({CYCLE_STATUS_LABEL[c.status]})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {cycle && (
        <div className="px-4 py-3 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-bold text-slate-900">{cycle.cycle_name}</span>
          <CycleStatusBadge status={cycle.status} />
          <span className="text-slate-500">
            Period: {windowLabel(cycle.start_date, cycle.end_date)} • Review window: <strong className="text-slate-700">{windowLabel(cycle.review_start_date, cycle.review_end_date)}</strong>
          </span>
          {cycle.status === 'REVIEW_OPEN' && cycle.days_left ? (
            <span className="text-blue-700 font-semibold">
              Closes in {cycle.days_left} day{cycle.days_left === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      )}

      {tabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                current === t.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      )}

      {current === 'SELF' && <SelfReviewTab data={my} loading={isLoading} />}
      {current === 'TEAM' && (
        <TeamReviewTab cycleId={activeCycleId} isAdmin={isAdmin} isManager={isManager} departments={departments} focusEmpId={focusEmp} />
      )}
      {current === 'PROJECT' && <ProjectRatingTab cycleId={activeCycleId} />}
      {current === 'SUMMARY' && (
        <RatingSummaryTab
          cycleId={activeCycleId}
          departments={departments}
          onRate={(empId) => {
            setFocusEmp(empId);
            setTab('TEAM');
          }}
        />
      )}
    </div>
  );
};
