import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { Cake, Gift, MessageCircle, PartyPopper } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';

interface Birthday {
  emp_id: number;
  name: string;
  photo_url: string | null;
  date: string;
  days_until: number;
}

const when = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`);

const parts = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    day: d,
    month: dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    weekday: dt.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    // the birth year is never sent or shown
    full: dt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', timeZone: 'UTC' }),
  };
};

const BALLOONS = [
  { c: 'bg-rose-400', l: '6%', d: '0s', h: 46 },
  { c: 'bg-yellow-300', l: '34%', d: '0.6s', h: 54 },
  { c: 'bg-sky-300', l: '62%', d: '1.2s', h: 42 },
];

const CONFETTI = [
  { l: 5, c: '#FFFFFF', d: 0, t: 4.4, s: 7, r: true, x: 12 },
  { l: 14, c: '#FDE047', d: 1.1, t: 5.1, s: 8, r: false, x: -12 },
  { l: 23, c: '#A5F3FC', d: 0.4, t: 4.6, s: 6, r: true, x: 14 },
  { l: 33, c: '#FB7185', d: 2.0, t: 5.3, s: 8, r: false, x: -10 },
  { l: 43, c: '#FFFFFF', d: 0.8, t: 4.2, s: 7, r: true, x: 10 },
  { l: 53, c: '#FDBA74', d: 1.6, t: 5.0, s: 8, r: false, x: -14 },
  { l: 62, c: '#FDE047', d: 0.2, t: 4.5, s: 6, r: true, x: 16 },
  { l: 71, c: '#C4B5FD', d: 2.4, t: 5.2, s: 8, r: false, x: -8 },
  { l: 80, c: '#FFFFFF', d: 0.9, t: 4.7, s: 7, r: true, x: 8 },
  { l: 88, c: '#FB7185', d: 1.9, t: 5.4, s: 6, r: false, x: -12 },
  { l: 95, c: '#A5F3FC', d: 0.5, t: 4.3, s: 8, r: true, x: 10 },
];

const Confetti: React.FC = () => (
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
);

/** The birthday itself: a big celebration. Addressed to the person on their own day, a nudge to wish them for everyone else. */
const TodayHero: React.FC<{ b: Birthday; mine: boolean }> = ({ b, mine }) => {
  const first = b.name.split(/\s+/)[0];
  return (
    <div className="hol-shine relative flex min-h-[12rem] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 p-5 text-white shadow-lg shadow-orange-500/25">
      <Confetti />
      {/* balloons drifting along the bottom edge */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-full">
        {BALLOONS.map((bl, i) => (
          <span key={i} className="hol-float absolute bottom-2 hidden flex-col items-center sm:flex" style={{ left: bl.l, animationDelay: bl.d, opacity: 0.55 }}>
            <span className={`block rounded-[50%_50%_48%_48%] ${bl.c} shadow-inner`} style={{ width: bl.h * 0.78, height: bl.h }} />
            <span className="block h-7 w-px bg-white/60" />
          </span>
        ))}
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
          <Cake className="h-3.5 w-3.5" /> {mine ? 'Your birthday' : 'Birthday today'}
        </span>
        <PartyPopper className="hol-float h-8 w-8 text-yellow-100 drop-shadow" aria-hidden />
      </div>

      <div className="relative mt-4 flex items-center gap-4">
        <div className="hol-float shrink-0 rounded-full bg-white/30 p-1.5 shadow-lg ring-4 ring-white/70">
          <Avatar name={b.name} src={b.photo_url} size={72} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold leading-tight tracking-tight drop-shadow-sm sm:text-[26px]">
            {mine ? `Happy Birthday, ${first}!` : b.name}
          </p>
          <p className="mt-1 text-sm text-white/90">
            {mine ? 'The whole team wishes you a wonderful year ahead.' : `Wish ${first} a great day.`}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-2">
        {mine ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-600">Have a fantastic day</span>
        ) : (
          <Link
            to="/messenger"
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Send a wish
          </Link>
        )}
        <span className="text-[11px] text-white/85">{parts(b.date).full}</span>
      </div>
    </div>
  );
};

/** The next birthday, in the same style as the "Next holiday" card */
const NextHero: React.FC<{ b: Birthday }> = ({ b }) => {
  const p = parts(b.date);
  return (
    <div className="hol-shine relative flex min-h-[12rem] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 p-5 text-white shadow-lg shadow-pink-500/20">
      <Confetti />
      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
          Next birthday
        </span>
        <Cake className="hol-float h-8 w-8 text-yellow-200 drop-shadow" aria-hidden />
      </div>

      <div className="relative mt-5 flex items-end gap-4">
        <div className="flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-pink-600 shadow-md">
          <span className="text-[11px] font-bold uppercase leading-none tracking-wide">{p.month}</span>
          <span className="mt-0.5 text-3xl font-bold leading-none tabular-nums">{p.day}</span>
        </div>
        <Avatar name={b.name} src={b.photo_url} size={52} />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-tight tracking-tight">{b.name}</p>
          <p className="mt-0.5 truncate text-sm text-white/85">{p.weekday}</p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-pink-600">
          {b.days_until === 1 ? 'Tomorrow' : `${b.days_until} days to go`}
        </span>
        <span className="text-[11px] text-white/80">{p.full}</span>
      </div>
    </div>
  );
};

/**
 * Everybody's birthday, in the style of the holiday card: a celebration on the day itself, and a reminder for the
 * next 10 days. Shown to every employee on their attendance page and on the dashboard; renders nothing when there
 * is none.
 */
export const BirthdayCelebrations: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ['birthdays'],
    queryFn: () => customFetch<Birthday[]>('/api/v1/attendance/birthdays?days=10'),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const today = data.filter((b) => b.days_until === 0);
  const upcoming = data.filter((b) => b.days_until > 0);
  if (today.length === 0 && upcoming.length === 0) return null;

  // On a birthday the hero is the celebration; otherwise it is the next one coming
  const nextHero = today.length === 0 ? upcoming[0] : null;
  const list = today.length === 0 ? upcoming.slice(1) : upcoming;

  return (
    <section id="birthdays" aria-label="Birthdays" className={`rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
            <Gift className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Birthdays</h3>
            <p className="text-xs text-slate-500">
              {today.length > 0
                ? `${today.length} ${today.length === 1 ? 'birthday' : 'birthdays'} today${upcoming.length ? `, ${upcoming.length} more in the next 10 days` : ''}`
                : `${upcoming.length} in the next 10 days`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-4">
          {today.map((b) => (
            <TodayHero key={b.emp_id} b={b} mine={b.emp_id === user?.emp_id} />
          ))}
          {nextHero && <NextHero b={nextHero} />}
        </div>

        <ul className="grid content-start gap-2.5">
          {list.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No more birthdays in the next 10 days.
            </li>
          ) : (
            list.map((b, i) => {
              const p = parts(b.date);
              return (
                <li
                  key={b.emp_id}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="hol-rise flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition hover:border-pink-100 hover:bg-pink-50/40"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                    <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-pink-500">{p.month}</span>
                    <span className="mt-0.5 text-base font-semibold leading-none tabular-nums">{p.day}</span>
                  </div>
                  <Avatar name={b.name} src={b.photo_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{b.name}</p>
                    <p className="truncate text-xs text-slate-500">{p.weekday}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{when(b.days_until)}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
};
