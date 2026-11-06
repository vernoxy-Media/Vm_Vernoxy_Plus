import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarHeart, PartyPopper } from 'lucide-react';
import { fetchCalendarHolidays } from '@/features/calendar/api/calendar.api';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Whole days from today to a YYYY-MM-DD date (0 = today) */
const daysUntil = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86_400_000);
};

const when = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`);

/** Falling confetti: fixed positions so the hero looks the same on every render */
const CONFETTI = [
  { l: 6, c: '#FDE047', d: 0, t: 4.2, s: 8, r: true, x: 14 },
  { l: 14, c: '#FFFFFF', d: 1.1, t: 5.1, s: 6, r: false, x: -10 },
  { l: 22, c: '#FB7185', d: 0.4, t: 4.6, s: 9, r: false, x: 18 },
  { l: 31, c: '#A5F3FC', d: 2.2, t: 5.4, s: 7, r: true, x: -16 },
  { l: 40, c: '#FDE047', d: 0.9, t: 4.0, s: 6, r: false, x: 10 },
  { l: 49, c: '#FFFFFF', d: 1.8, t: 5.0, s: 8, r: true, x: -12 },
  { l: 57, c: '#FDBA74', d: 0.2, t: 4.4, s: 7, r: false, x: 16 },
  { l: 66, c: '#C4B5FD', d: 1.5, t: 5.2, s: 9, r: true, x: -8 },
  { l: 74, c: '#FDE047', d: 2.6, t: 4.3, s: 6, r: false, x: 12 },
  { l: 82, c: '#FFFFFF', d: 0.6, t: 4.8, s: 8, r: true, x: -14 },
  { l: 90, c: '#FB7185', d: 1.9, t: 5.3, s: 7, r: false, x: 8 },
  { l: 96, c: '#A5F3FC', d: 0.3, t: 4.5, s: 6, r: true, x: -10 },
];

/**
 * The office holidays set by the administrator, soonest first.
 * Every employee sees them, on their attendance page and on the dashboard.
 */
export const UpcomingHolidays: React.FC<{ limit?: number; className?: string }> = ({ limit = 6, className = '' }) => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['upcoming-holidays', iso(new Date()).slice(0, 7)],
    queryFn: () => {
      const from = new Date();
      const to = new Date();
      to.setFullYear(to.getFullYear() + 1);
      return fetchCalendarHolidays(iso(from), iso(to));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const upcoming = [...data]
    .filter((h) => daysUntil(h.holiday_date) >= 0)
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  const next = upcoming[0];
  const rest = upcoming.slice(1, limit);
  const thisYearLeft = upcoming.filter((h) => h.holiday_date.slice(0, 4) === String(new Date().getFullYear())).length;

  const parts = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return {
      day: d,
      month: dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      weekday: dt.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      full: dt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  };

  return (
    <section id="upcoming-holidays" aria-label="Office holidays" className={`rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <CalendarHeart className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Office holidays</h3>
            <p className="text-xs text-slate-500">{upcoming.length ? `${thisYearLeft} more this year` : 'Nothing scheduled yet'}</p>
          </div>
        </div>
        <Link to="/calendar" className="text-xs font-semibold text-[#1471DD] hover:underline">
          View calendar
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : !next ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          <PartyPopper className="h-5 w-5 text-slate-400" />
          No upcoming holidays have been added by the administrator.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* The next holiday, celebrated */}
          {(() => {
            const p = parts(next.holiday_date);
            const n = daysUntil(next.holiday_date);
            return (
              <div className="hol-shine relative flex min-h-[12rem] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-600 p-5 text-white shadow-lg shadow-rose-500/20">
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  {CONFETTI.map((c, i) => (
                    <span
                      key={i}
                      className={`hol-confetti absolute top-0 block ${c.r ? 'rounded-full' : 'rounded-[2px]'}`}
                      style={
                        {
                          left: `${c.l}%`,
                          width: c.s,
                          height: c.r ? c.s : c.s * 1.6,
                          background: c.c,
                          '--hol-delay': `${c.d}s`,
                          '--hol-dur': `${c.t}s`,
                          '--hol-drift': `${c.x}px`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>

                <div className="relative flex items-start justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
                    {n === 0 ? 'Happening today' : 'Next holiday'}
                  </span>
                  <PartyPopper className="hol-float h-8 w-8 text-yellow-200 drop-shadow" aria-hidden />
                </div>

                <div className="relative mt-5 flex items-end gap-4">
                  <div className="flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-rose-600 shadow-md">
                    <span className="text-[11px] font-bold uppercase leading-none tracking-wide">{p.month}</span>
                    <span className="mt-0.5 text-3xl font-bold leading-none tabular-nums">{p.day}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold leading-tight tracking-tight">{next.name}</p>
                    <p className="mt-0.5 truncate text-sm text-white/85">{p.weekday}</p>
                  </div>
                </div>

                <div className="relative mt-4 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-600">
                    {n === 0 ? 'Enjoy the day off!' : n === 1 ? 'Tomorrow' : `${n} days to go`}
                  </span>
                  <span className="text-[11px] text-white/80">{p.full}</span>
                </div>
              </div>
            );
          })()}

          {/* The ones after it */}
          <ul className="grid content-start gap-2.5">
            {rest.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">That is the last holiday scheduled for now.</li>
            ) : (
              rest.map((h, i) => {
                const p = parts(h.holiday_date);
                return (
                  <li
                    key={h.holiday_id}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="hol-rise flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition hover:border-rose-100 hover:bg-rose-50/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                      <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-rose-500">{p.month}</span>
                      <span className="mt-0.5 text-base font-semibold leading-none tabular-nums">{p.day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{h.name}</p>
                      <p className="truncate text-xs text-slate-500">{p.weekday}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{when(daysUntil(h.holiday_date))}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </section>
  );
};
