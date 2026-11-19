import React, { useEffect, useMemo, useState } from 'react';
import { Info, BarChart2, X } from 'lucide-react';
import {
  AttendanceSummaryBucket,
  AttendanceSummaryPerson,
  EnrichedAttendanceRecord,
} from './attendance-analytics.types';
import { calculateAttendanceSummaryBuckets } from './attendance-analytics.utils';

interface MonthlyAttendanceSummaryChartProps {
  records: EnrichedAttendanceRecord[];
}

type PeopleTab = 'absent' | 'late' | 'missing';

// Bottom to top of each bar
const SEGMENTS = [
  { key: 'presentCount', label: 'Present', bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  { key: 'halfDayCount', label: 'Half Day', bar: 'bg-amber-500', dot: 'bg-amber-500', text: 'text-amber-600' },
  { key: 'onLeaveCount', label: 'On Leave', bar: 'bg-blue-500', dot: 'bg-blue-500', text: 'text-blue-600' },
  { key: 'missingPunchCount', label: 'Missing Punch', bar: 'bg-violet-500', dot: 'bg-violet-500', text: 'text-violet-600' },
  { key: 'absentCount', label: 'Absent', bar: 'bg-rose-500', dot: 'bg-rose-500', text: 'text-rose-600' },
] as const;


const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

export const MonthlyAttendanceSummaryChart: React.FC<MonthlyAttendanceSummaryChartProps> = ({ records }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<PeopleTab>('absent');

  // A new date range or filter closes any open list
  useEffect(() => {
    setSelectedKey(null);
  }, [records]);

  const buckets = useMemo(() => calculateAttendanceSummaryBuckets(records, 'month'), [records]);
  const maxTotal = Math.max(1, ...buckets.map((b) => b.totalRecords));

  const totals = useMemo(() => {
    const t = { presentCount: 0, halfDayCount: 0, onLeaveCount: 0, missingPunchCount: 0, absentCount: 0, lateMarkCount: 0, totalRecords: 0 };
    buckets.forEach((b) => {
      t.presentCount += b.presentCount;
      t.halfDayCount += b.halfDayCount;
      t.onLeaveCount += b.onLeaveCount;
      t.missingPunchCount += b.missingPunchCount;
      t.absentCount += b.absentCount;
      t.lateMarkCount += b.lateMarkCount;
      t.totalRecords += b.totalRecords;
    });
    return t;
  }, [buckets]);

  const selected = buckets.find((b) => b.key === selectedKey) ?? null;
  const readout = buckets.find((b) => b.key === hoveredKey) ?? selected;

  const openBucket = (b: AttendanceSummaryBucket) => {
    if (selectedKey === b.key) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(b.key);
    // Start on the first list that has someone in it
    setTab(b.absentEmployees.length ? 'absent' : b.lateEmployees.length ? 'late' : b.missingPunchEmployees.length ? 'missing' : 'absent');
  };

  const peopleFor = (b: AttendanceSummaryBucket): AttendanceSummaryPerson[] =>
    tab === 'absent' ? b.absentEmployees : tab === 'late' ? b.lateEmployees : b.missingPunchEmployees;

  const personNote = (p: AttendanceSummaryPerson): string => {
    if (tab === 'late') {
      const mins = p.lateMinutes ? `${p.lateMinutes} min late` : 'Late';
      return p.days > 1 ? `${p.days} times · ${mins}` : mins;
    }
    const what = tab === 'absent' ? 'absent' : 'missing punch';
    return `${p.days} ${p.days === 1 ? 'day' : 'days'} ${what}`;
  };

  const tabs: Array<{ key: PeopleTab; label: string; count: number }> = selected
    ? [
        { key: 'absent', label: 'Absent', count: selected.absentEmployees.length },
        { key: 'late', label: 'Late', count: selected.lateEmployees.length },
        { key: 'missing', label: 'Missing Punch', count: selected.missingPunchEmployees.length },
      ]
    : [];

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monthly Attendance Summary</h3>
            <p className="text-[11px] text-slate-500">Status counts per month, with late marks counted separately</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showInfo && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Attendance Summary</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Each bar is one month of employee-days, split into Present, Half Day, On Leave, Missing Punch and Absent. Late marks are counted on their own and are not part of the bar. Click a bar to see which employees were absent, late or had a missing punch.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Totals for the whole range, with percentages */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px]">
        {SEGMENTS.map((s) => {
          const n = totals[s.key];
          return (
            <span key={s.key} className="inline-flex items-center gap-1 text-slate-500">
              <span className={`h-2 w-2 rounded-xs ${s.dot}`} />
              {s.label}
              <strong className="text-slate-800">{n}</strong>
              <span className="text-slate-400">({pct(n, totals.totalRecords)}%)</span>
            </span>
          );
        })}
      </div>

      {/* Hover / selected readout (kept outside the scrolling area so it is never clipped) */}
      {/* Fixed height: a readout that changes height on hover moves the bars under the pointer and makes them flicker */}
      {/* With a single bar the totals line above already shows the same numbers, so there is no readout */}
      <div className={buckets.length > 1 ? 'mt-2 h-[68px]' : 'hidden'}>
        {readout && (
          <div className="h-full overflow-y-auto rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] leading-4 text-slate-500">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <strong className="text-slate-800">{readout.fullLabel}</strong>
              <span>{readout.totalRecords} records</span>
              {SEGMENTS.map((s) => (
                <span key={s.key} className={readout[s.key] > 0 ? s.text : 'text-slate-400'}>
                  {s.label} {readout[s.key]} ({pct(readout[s.key], readout.totalRecords)}%)
                </span>
              ))}
              <span className="font-semibold text-purple-600">Late {readout.lateMarkCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stacked bars */}
      <div className="my-3 h-44 overflow-x-auto border-b border-slate-200">
        {buckets.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No attendance records found for this period
          </div>
        ) : (
          <div
            className={`flex h-full items-end px-1 pt-2 gap-1.5`}
            // A year fits inside the card; only a range of several years scrolls sideways
            style={{ minWidth: buckets.length > 24 ? buckets.length * 28 : undefined }}
          >
            {buckets.map((b) => {
              const heightPercent = Math.max((b.totalRecords / maxTotal) * 100, 4);
              const isSelected = selectedKey === b.key;
              const isDimmed = (hoveredKey ?? selectedKey) !== null && (hoveredKey ?? selectedKey) !== b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  onMouseEnter={() => setHoveredKey(b.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(b.key)}
                  onBlur={() => setHoveredKey(null)}
                  onClick={() => openBucket(b)}
                  aria-pressed={isSelected}
                  aria-label={`${b.fullLabel}: ${b.totalRecords} records, ${b.absentCount} absent, ${b.lateMarkCount} late`}
                  className={`group flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end transition-opacity ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  {b.lateMarkCount > 0 && (
                    <span className="mb-1 rounded-full border border-purple-200/70 bg-purple-50 px-1 text-[9px] font-bold text-purple-700">
                      {b.lateMarkCount}L
                    </span>
                  )}
                  <div
                    className={`flex w-full max-w-[40px] flex-col-reverse overflow-hidden rounded-t-md transition-all ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {SEGMENTS.map((s) =>
                      b[s.key] > 0 ? (
                        <div
                          key={s.key}
                          className={s.bar}
                          style={{ flexGrow: b[s.key], flexBasis: 0, minHeight: 3 }}
                        />
                      ) : null,
                    )}
                  </div>
                  <span className={`mt-1.5 flex h-7 w-full flex-col items-center whitespace-nowrap text-[10px] font-medium leading-3 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                    {b.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Who is behind the numbers */}
      {selected && (
        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-800">{selected.fullLabel}</p>
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              aria-label="Close list"
              className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label} <span className={tab === t.key ? 'text-blue-100' : 'text-slate-400'}>{t.count}</span>
              </button>
            ))}
          </div>
          {peopleFor(selected).length === 0 ? (
            <p className="py-2 text-center text-[11px] text-slate-400">
              {tab === 'absent' ? 'Nobody was absent' : tab === 'late' ? 'Nobody was late' : 'No missing punches'} in this month.
            </p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {peopleFor(selected).map((p) => (
                <li key={p.empId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">{p.employeeName}</span>
                    <span className="block truncate text-[10px] text-slate-400">{p.department}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-600">{personNote(p)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span>
          {totals.totalRecords.toLocaleString()} employee-days · {buckets.length} {buckets.length === 1 ? 'month' : 'months'}
        </span>
        <span className="flex items-center gap-1 rounded-md border border-purple-200/50 bg-purple-50 px-2 py-0.5 font-semibold text-purple-700">
          ● Late Mark (Separate): {totals.lateMarkCount}
        </span>
      </div>
    </div>
  );
};
