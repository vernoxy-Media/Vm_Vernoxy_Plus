import React from 'react';
import { Link } from 'react-router-dom';
import { Cake, Gift, MessageCircle, PartyPopper, Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';
import { useBirthdays, type Birthday } from '../hooks/use-birthdays';

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
  { c: 'bg-rose-400', r: '4%', d: '0s', h: 62 },
  { c: 'bg-yellow-300', r: '15%', d: '0.7s', h: 74 },
  { c: 'bg-sky-300', r: '27%', d: '1.3s', h: 56 },
  { c: 'bg-emerald-300', r: '37%', d: '0.4s', h: 48 },
];

const CONFETTI = [
  { l: 4, c: '#FFFFFF', d: 0, t: 4.4, s: 7, r: true, x: 12 },
  { l: 12, c: '#FDE047', d: 1.1, t: 5.1, s: 8, r: false, x: -12 },
  { l: 21, c: '#A5F3FC', d: 0.4, t: 4.6, s: 6, r: true, x: 14 },
  { l: 30, c: '#FB7185', d: 2.0, t: 5.3, s: 8, r: false, x: -10 },
  { l: 40, c: '#FFFFFF', d: 0.8, t: 4.2, s: 7, r: true, x: 10 },
  { l: 49, c: '#FDBA74', d: 1.6, t: 5.0, s: 8, r: false, x: -14 },
  { l: 58, c: '#FDE047', d: 0.2, t: 4.5, s: 6, r: true, x: 16 },
  { l: 67, c: '#C4B5FD', d: 2.4, t: 5.2, s: 8, r: false, x: -8 },
  { l: 76, c: '#FFFFFF', d: 0.9, t: 4.7, s: 7, r: true, x: 8 },
  { l: 85, c: '#FB7185', d: 1.9, t: 5.4, s: 6, r: false, x: -12 },
  { l: 93, c: '#A5F3FC', d: 0.5, t: 4.3, s: 8, r: true, x: 10 },
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

/**
 * The birthday itself: a wide celebration banner. Written to the person on their own day, a nudge to send a wish for
 * everyone else.
 */
const TodayBanner: React.FC<{ b: Birthday; mine: boolean }> = ({ b, mine }) => {
  const first = b.name.split(/\s+/)[0];
  return (
    <div className="hol-shine relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 p-5 text-white shadow-xl shadow-fuchsia-500/25 sm:p-7">
      <Confetti />
      {/* balloons rising on the right */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 sm:block">
        {BALLOONS.map((bl, i) => (
          <span
            key={i}
            className="hol-float absolute bottom-3 flex flex-col items-center"
            style={{ right: bl.r, animationDelay: bl.d, opacity: 0.85 }}
          >
            <span className={`block rounded-[50%_50%_48%_48%] ${bl.c} shadow-inner`} style={{ width: bl.h * 0.78, height: bl.h }} />
            <span className="block h-12 w-px bg-white/60" />
          </span>
        ))}
        <Cake className="absolute bottom-5 right-[46%] h-20 w-20 text-white/25" aria-hidden />
      </div>

      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <span aria-hidden className="absolute -inset-2 rounded-full bg-white/25 blur-md" />
          <div className="hol-float relative rounded-full bg-gradient-to-br from-yellow-200 to-pink-300 p-1.5 shadow-2xl">
            <div className="rounded-full bg-white p-1">
              <Avatar name={b.name} src={b.photo_url} size={92} />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-fuchsia-600 shadow-lg ring-2 ring-fuchsia-200">
            <Cake className="h-[18px] w-[18px]" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
            <PartyPopper className="h-3.5 w-3.5" /> {mine ? 'It is your birthday' : 'Birthday today'} · {parts(b.date).full}
          </span>
          <p className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight drop-shadow-sm sm:text-4xl">
            {mine ? `Happy Birthday, ${first}!` : b.name}
          </p>
          <p className="mt-1.5 max-w-xl text-sm text-white/90 sm:text-[15px]">
            {mine
              ? 'The whole team is wishing you a wonderful day and a great year ahead.'
              : `Make ${first}'s day: send a wish and let them know you are thinking of them.`}
          </p>
          {!mine && (
            <Link
              to="/messenger"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-fuchsia-600 shadow-md transition hover:bg-fuchsia-50"
            >
              <MessageCircle className="h-4 w-4" /> Send a wish
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

/** One upcoming birthday as a small tile: the person in the middle, the date above and the countdown below */
const Tile: React.FC<{ b: Birthday; index: number; highlight: boolean }> = ({ b, index, highlight }) => {
  const p = parts(b.date);
  const near = b.days_until <= 2;
  return (
    <li
      style={{ animationDelay: `${index * 70}ms` }}
      className={`hol-rise relative overflow-hidden rounded-2xl border bg-white text-center transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight ? 'border-fuchsia-200 shadow-sm shadow-fuchsia-100' : 'border-slate-100'
      }`}
    >
      <div className="h-12 bg-gradient-to-r from-pink-100 via-fuchsia-100 to-violet-100" />
      {highlight && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-600 shadow-sm">
          <Sparkles className="h-3 w-3" /> Next
        </span>
      )}
      <span className="absolute right-2.5 top-2.5 rounded-lg bg-white px-2 py-1 text-center leading-none shadow-sm ring-1 ring-fuchsia-100">
        <span className="block text-[9px] font-bold uppercase tracking-wide text-fuchsia-500">{p.month}</span>
        <span className="block text-sm font-bold tabular-nums text-slate-800">{p.day}</span>
      </span>
      <div className="-mt-8 flex justify-center">
        <div className="rounded-full bg-white p-1 shadow-md ring-1 ring-slate-100">
          <Avatar name={b.name} src={b.photo_url} size={56} />
        </div>
      </div>
      <div className="px-3 pb-4 pt-2">
        <p className="truncate text-sm font-semibold text-slate-900">{b.name}</p>
        <p className="truncate text-xs text-slate-500">{p.weekday}</p>
        <span
          className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
            near ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-slate-50 text-slate-600 ring-slate-200'
          }`}
        >
          <Cake className="h-3 w-3" /> {when(b.days_until)}
        </span>
      </div>
    </li>
  );
};

/**
 * Everybody's birthday: a celebration banner on the day itself, and tiles for the next 10 days.
 * Shown to every employee on their attendance page and on the dashboard; renders nothing when there is none.
 */
export const BirthdayCelebrations: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const { data = [] } = useBirthdays();

  const today = data.filter((b) => b.days_until === 0);
  const upcoming = data.filter((b) => b.days_until > 0);
  if (today.length === 0 && upcoming.length === 0) return null;

  return (
    <section id="birthdays" aria-label="Birthdays" className={`rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-500">
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

      <div className="space-y-4">
        {today.length > 0 && (
          <div className="grid gap-4">
            {today.map((b) => (
              <TodayBanner key={b.emp_id} b={b} mine={b.emp_id === user?.emp_id} />
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            {today.length > 0 && <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Coming up</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {upcoming.map((b, i) => (
                <Tile key={b.emp_id} b={b} index={i} highlight={today.length === 0 && i === 0} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
