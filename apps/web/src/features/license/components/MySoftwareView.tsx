import React, { useState } from 'react';
import { ExternalLink, Laptop, LifeBuoy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMySoftwareQuery, useMyTeamSoftwareQuery } from '../hooks/use-licenses';

const dmy = (v?: string | null) => (v ? String(v).slice(0, 10).split('-').reverse().join('-') : '—');

/** "Report a problem" opens Add Complaint with the type IT & Equipment and the software name filled in (BFD 9, marker 5). */
const problemLink = (softwareName: string) =>
  `/complaints?new=1&type=${encodeURIComponent('IT & Equipment')}&subject=${encodeURIComponent(`Problem with ${softwareName}`)}`;

/**
 * BFD 9 My Software: only the employee's own seats (no keys, no costs). Revoked seats stay as
 * "Ended" for 12 months. A Reporting Manager also sees "My Team".
 */
export const MySoftwareView: React.FC = () => {
  const { data: softwareList = [], isLoading } = useMySoftwareQuery();
  const { data: team } = useMyTeamSoftwareQuery();
  const [tab, setTab] = useState<'mine' | 'team'>('mine');
  const isManager = Boolean(team?.is_manager);

  return (
    <div className="space-y-6">
      <div className="p-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Laptop className="w-5 h-5" />
            My Software
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">Software the company has given you, with the login to use.</p>
        </div>
        {isManager && (
          <div className="inline-flex rounded-xl bg-white/15 p-1">
            {(['mine', 'team'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${tab === t ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'}`}
              >
                {t === 'mine' ? 'My Software' : 'My Team'}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'team' && isManager ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Team member</th>
                <th className="px-4 py-3">Software</th>
                <th className="px-4 py-3">Login / Account</th>
                <th className="px-4 py-3">Assigned From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team!.members.map((m) =>
                m.software.length === 0 ? (
                  <tr key={m.emp_id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{m.name}</td>
                    <td className="px-4 py-3 text-slate-400" colSpan={3}>
                      No software assigned
                    </td>
                  </tr>
                ) : (
                  m.software.map((s, i) => (
                    <tr key={`${m.emp_id}-${s.software_id}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{i === 0 ? m.name : ''}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{s.software_name}</span>
                        <span className="ml-1 text-slate-400">{s.vendor}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">{s.login_account_id || '—'}</td>
                      <td className="px-4 py-3">{dmy(s.assigned_from)}</td>
                    </tr>
                  ))
                ),
              )}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">Costs and license keys are not shown here.</p>
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading your software...</div>
      ) : softwareList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
          <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto text-slate-400">
            <Laptop className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No software has been assigned to you yet.</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Software</th>
                <th className="px-4 py-3">Your login / account</th>
                <th className="px-4 py-3">Assigned From</th>
                <th className="px-4 py-3">Valid till</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Help</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {softwareList.map((item) => {
                const ended = item.assignment_status === 'Ended';
                const noExpiry = item.license_type.startsWith('Perpetual') || item.license_type.startsWith('Free');
                return (
                  <tr key={item.assignment_id} className={ended ? 'bg-slate-50/60 text-slate-400' : ''}>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${ended ? 'text-slate-500' : 'text-slate-900'}`}>{item.software_name}</div>
                      <div className="text-[11px] text-slate-400">{item.vendor || '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{item.login_account_id || '—'}</td>
                    <td className="px-4 py-3">{dmy(item.assigned_from)}</td>
                    <td className="px-4 py-3">
                      {ended ? (
                        <>Revoked {dmy(item.revoked_on)}</>
                      ) : noExpiry ? (
                        'No expiry'
                      ) : item.expiry_date ? (
                        <span className={item.days_remaining !== null && item.days_remaining !== undefined && item.days_remaining <= 30 ? 'font-semibold text-amber-600' : ''}>
                          {dmy(item.expiry_date)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          ended ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {ended ? 'Ended' : 'In use'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ended ? (
                        '—'
                      ) : (
                        <Link to={problemLink(item.software_name)} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
                          <LifeBuoy className="h-3.5 w-3.5" />
                          Report a problem
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="flex items-center gap-1.5 border-t border-slate-100 bg-blue-50/40 px-4 py-2.5 text-[11.5px] text-blue-800">
            <Users className="h-3.5 w-3.5" />
            Need other software for your work? Ask your Reporting Manager or raise a request with IT Support.
          </p>
        </div>
      )}
    </div>
  );
};
