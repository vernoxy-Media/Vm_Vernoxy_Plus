import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { AlertTriangle, CheckCircle2, Inbox, MessageSquareWarning } from 'lucide-react';

interface ComplaintDashboard {
  role: 'admin' | 'handler' | 'none';
  admin?: { new: number; overdue: number; resolved_waiting: number };
  handler?: { active: number; overdue: number };
}

/**
 * BFD 11 Part 3 "Dashboard": the Admin sees New waiting for review, Overdue and Resolved waiting
 * to be closed; a handler sees their Active and Overdue complaints. Each opens the matching list.
 */
export const ComplaintsDashboardCard: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['complaints-dashboard'],
    queryFn: () => customFetch<ComplaintDashboard>('/api/v1/complaints/dashboard'),
    staleTime: 60_000,
  });
  if (!data || data.role === 'none') return null;

  const tiles =
    data.role === 'admin' && data.admin
      ? [
          { label: 'New, waiting for review', value: data.admin.new, to: '/complaints?tab=manage&view=New', icon: Inbox, tone: 'text-indigo-600 bg-indigo-50' },
          { label: 'Overdue', value: data.admin.overdue, to: '/complaints?tab=manage&view=Overdue', icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
          { label: 'Resolved, waiting to be closed', value: data.admin.resolved_waiting, to: '/complaints?tab=manage&view=Resolved', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
        ]
      : [
          { label: 'My active complaints', value: data.handler?.active ?? 0, to: '/complaints?tab=manage&view=Active', icon: Inbox, tone: 'text-indigo-600 bg-indigo-50' },
          { label: 'Overdue', value: data.handler?.overdue ?? 0, to: '/complaints?tab=manage&view=Overdue', icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
        ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <MessageSquareWarning className="h-4 w-4 text-indigo-600" />
          Complaints
        </h3>
        <Link to="/complaints?tab=manage" className="text-xs font-semibold text-indigo-600 hover:underline">
          Open list
        </Link>
      </div>
      <div className={`grid gap-3 ${tiles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={t.to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-lg font-extrabold leading-none text-slate-900">{t.value}</span>
                <span className="text-[11.5px] text-slate-500">{t.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
