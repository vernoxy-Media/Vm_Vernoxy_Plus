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
} from 'lucide-react';
import { US12SalesActivityCounters } from '../../types/sales-dashboard.types';

interface SalesActivityCounterCardsProps {
  data?: US12SalesActivityCounters;
  selectedDate: string;
  onDateChange: (d: string) => void;
  allowedCards: Record<string, boolean>;
}

export const SalesActivityCounterCards: React.FC<SalesActivityCounterCardsProps> = ({
  data,
  selectedDate,
  onDateChange,
  allowedCards,
}) => {
  return (
    <div className="space-y-3">
      {/* Date Header for Daily Activity */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Sales Activity & Overview Counters</h3>
          <p className="text-[11px] text-slate-500">Daily calling, emails, follow-up efforts and overall sales database</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of 8 Counter Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
        {/* 1. Calls Made */}
        {allowedCards.us12_calls !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Calls Made</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <PhoneCall className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{data?.calls_made.today ?? 0}</span>
              {data?.calls_made && (
                <span
                  className={`inline-flex items-center text-[10px] font-bold ${
                    data.calls_made.arrow === 'up'
                      ? 'text-emerald-600'
                      : data.calls_made.arrow === 'down'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {data.calls_made.arrow === 'up' && <ArrowUp className="h-3 w-3" />}
                  {data.calls_made.arrow === 'down' && <ArrowDown className="h-3 w-3" />}
                  {data.calls_made.arrow === 'neutral' && <ArrowRight className="h-3 w-3" />}
                  {Math.abs(data.calls_made.change)} vs yesterday
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Outgoing calls by logged-in user</p>
          </div>
        )}

        {/* 2. Emails Sent */}
        {allowedCards.us12_emails !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Emails Sent</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Mail className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{data?.emails_sent.today ?? 0}</span>
              {data?.emails_sent && (
                <span
                  className={`inline-flex items-center text-[10px] font-bold ${
                    data.emails_sent.arrow === 'up'
                      ? 'text-emerald-600'
                      : data.emails_sent.arrow === 'down'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                  }`}
                >
                  {data.emails_sent.arrow === 'up' && <ArrowUp className="h-3 w-3" />}
                  {data.emails_sent.arrow === 'down' && <ArrowDown className="h-3 w-3" />}
                  {data.emails_sent.arrow === 'neutral' && <ArrowRight className="h-3 w-3" />}
                  {Math.abs(data.emails_sent.change)} vs yesterday
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Outgoing emails by logged-in user</p>
          </div>
        )}

        {/* 3. Today's Follow-ups */}
        {allowedCards.us12_today_fu !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Follow-ups</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-slate-900">{data?.todays_follow_ups.scheduled_today ?? 0}</span>
                <span className="block text-[9px] font-semibold text-slate-400 uppercase">Scheduled</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-600">{data?.todays_follow_ups.completed_today ?? 0}</span>
                <span className="block text-[9px] font-semibold text-emerald-600/80 uppercase">Completed</span>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Follow-up status on selected date</p>
          </div>
        )}

        {/* 4. Total Follow-ups Done */}
        {allowedCards.us12_total_fu !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Follow-ups Done</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ListChecks className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{data?.total_follow_ups_done.count ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-500">completed</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400 truncate" title={data?.total_follow_ups_done.period}>
              Period: {data?.total_follow_ups_done.period || 'This Month'}
            </p>
          </div>
        )}

        {/* 5. Average Call Duration */}
        {allowedCards.us12_duration !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Avg Call Duration</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{data?.average_call_duration.display ?? 'N/A'}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Answered calls on selected date</p>
          </div>
        )}

        {/* 6. Unanswered Calls */}
        {allowedCards.us12_unanswered !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unanswered Calls</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <PhoneOff className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">{data?.unanswered_calls.count ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-500">attempts</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">No answer, busy, rejected or failed</p>
          </div>
        )}

        {/* 7. Total Leads */}
        {allowedCards.us12_leads !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Leads</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Users2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{data?.total_leads.count ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-500">leads in system</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Matching applicable filters</p>
          </div>
        )}

        {/* 8. Total Companies */}
        {allowedCards.us12_companies !== false && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Companies</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Building className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{data?.total_companies.count ?? 0}</span>
              <span className="text-[10px] font-semibold text-slate-500">target accounts</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Company database records</p>
          </div>
        )}
      </div>
    </div>
  );
};
