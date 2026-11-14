import React from 'react';
import {
  PhoneCall,
  Mail,
  CalendarCheck2,
  ListChecks,
  Clock,
  PhoneOff,
  Users2,
  Building,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { US12SalesActivityCounters } from '../../types/sales-dashboard.types';

interface SalesActivityCounterCardsProps {
  data?: US12SalesActivityCounters;
  selectedDate: string;
  onDateChange: (d: string) => void;
  allowedCards: Record<string, boolean>;
}

type Tone = 'blue' | 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'teal';

const TONES: Record<Tone, { chip: string; bar: string }> = {
  blue: { chip: 'bg-blue-50 text-blue-600 ring-blue-100', bar: 'from-blue-500 to-blue-400' },
  sky: { chip: 'bg-sky-50 text-sky-600 ring-sky-100', bar: 'from-sky-500 to-sky-400' },
  violet: { chip: 'bg-violet-50 text-violet-600 ring-violet-100', bar: 'from-violet-500 to-violet-400' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600 ring-emerald-100', bar: 'from-emerald-500 to-emerald-400' },
  amber: { chip: 'bg-amber-50 text-amber-600 ring-amber-100', bar: 'from-amber-500 to-amber-400' },
  rose: { chip: 'bg-rose-50 text-rose-600 ring-rose-100', bar: 'from-rose-500 to-rose-400' },
  indigo: { chip: 'bg-indigo-50 text-indigo-600 ring-indigo-100', bar: 'from-indigo-500 to-indigo-400' },
  teal: { chip: 'bg-teal-50 text-teal-600 ring-teal-100', bar: 'from-teal-500 to-teal-400' },
};

const Trend: React.FC<{ arrow: string; change: number }> = ({ arrow, change }) => {
  const cls =
    arrow === 'up'
      ? 'bg-emerald-50 text-emerald-700'
      : arrow === 'down'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-500';
  const Icon = arrow === 'up' ? ArrowUp : arrow === 'down' ? ArrowDown : ArrowRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(change)} vs yesterday
    </span>
  );
};

const KpiCard: React.FC<{
  label: string;
  icon: LucideIcon;
  tone: Tone;
  hint: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon: Icon, tone, hint, children }) => {
  const t = TONES[tone];
  return (
    <div className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] sm:p-5">
      <span className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${t.bar} opacity-80`} />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${t.chip}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">{children}</div>
      <p className="mt-2 truncate text-[11px] text-slate-400">{hint}</p>
    </div>
  );
};

const Value: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = 'text-slate-900',
}) => (
  <span className={`text-[28px] font-extrabold leading-none tracking-tight tabular-nums ${className}`}>
    {children}
  </span>
);

const Unit: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-xs font-medium text-slate-500">{children}</span>
);

export const SalesActivityCounterCards: React.FC<SalesActivityCounterCardsProps> = ({
  data,
  selectedDate,
  onDateChange,
  allowedCards,
}) => {
  const ok = (k: string) => allowedCards[k] !== false;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">Sales Activity &amp; Overview</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Daily calling, emails, follow-up efforts and overall sales database
          </p>
        </div>
        <label className="inline-flex h-9 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 sm:self-auto">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Select activity date"
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {ok('us12_calls') && (
          <KpiCard label="Calls Made" icon={PhoneCall} tone="blue" hint="Outgoing calls by logged-in user">
            <Value>{data?.calls_made.today ?? 0}</Value>
            {data?.calls_made && <Trend arrow={data.calls_made.arrow} change={data.calls_made.change} />}
          </KpiCard>
        )}

        {ok('us12_emails') && (
          <KpiCard label="Emails Sent" icon={Mail} tone="sky" hint="Outgoing emails by logged-in user">
            <Value>{data?.emails_sent.today ?? 0}</Value>
            {data?.emails_sent && <Trend arrow={data.emails_sent.arrow} change={data.emails_sent.change} />}
          </KpiCard>
        )}

        {ok('us12_today_fu') && (
          <KpiCard
            label="Today's Follow-ups"
            icon={CalendarCheck2}
            tone="violet"
            hint="Follow-up status on selected date"
          >
            <div className="flex w-full items-end justify-between">
              <div>
                <Value>{data?.todays_follow_ups.scheduled_today ?? 0}</Value>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Scheduled
                </span>
              </div>
              <div className="text-right">
                <Value className="text-emerald-600">{data?.todays_follow_ups.completed_today ?? 0}</Value>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
                  Completed
                </span>
              </div>
            </div>
          </KpiCard>
        )}

        {ok('us12_total_fu') && (
          <KpiCard
            label="Total Follow-ups Done"
            icon={ListChecks}
            tone="emerald"
            hint={`Period: ${data?.total_follow_ups_done.period || 'This Month'}`}
          >
            <Value>{data?.total_follow_ups_done.count ?? 0}</Value>
            <Unit>completed</Unit>
          </KpiCard>
        )}

        {ok('us12_duration') && (
          <KpiCard label="Avg Call Duration" icon={Clock} tone="amber" hint="Answered calls on selected date">
            <Value>{data?.average_call_duration.display ?? 'N/A'}</Value>
          </KpiCard>
        )}

        {ok('us12_unanswered') && (
          <KpiCard label="Unanswered Calls" icon={PhoneOff} tone="rose" hint="No answer, busy, rejected or failed">
            <Value className="text-rose-600">{data?.unanswered_calls.count ?? 0}</Value>
            <Unit>attempts</Unit>
          </KpiCard>
        )}

        {ok('us12_leads') && (
          <KpiCard label="Total Leads" icon={Users2} tone="indigo" hint="Matching applicable filters">
            <Value>{data?.total_leads.count ?? 0}</Value>
            <Unit>leads in system</Unit>
          </KpiCard>
        )}

        {ok('us12_companies') && (
          <KpiCard label="Total Companies" icon={Building} tone="teal" hint="Company database records">
            <Value>{data?.total_companies.count ?? 0}</Value>
            <Unit>target accounts</Unit>
          </KpiCard>
        )}
      </div>
    </section>
  );
};
