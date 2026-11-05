import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { Cake, Gift, MessageCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';

interface Birthday {
  emp_id: number;
  name: string;
  photo_url: string | null;
  date: string;
  days_until: number;
}

const when = (n: number) => (n === 1 ? 'Tomorrow' : `In ${n} days`);

const BALLOONS = [
  { c: 'bg-rose-400', l: '8%', d: '0s', h: 44 },
  { c: 'bg-yellow-300', l: '22%', d: '0.6s', h: 52 },
  { c: 'bg-sky-300', l: '36%', d: '1.2s', h: 40 },
];

const CONFETTI = [
  { l: 5, c: '#FFFFFF', d: 0, t: 4.4, s: 7, r: true, x: 12 },
  { l: 18, c: '#FDE047', d: 1.2, t: 5.2, s: 8, r: false, x: -14 },
  { l: 31, c: '#A5F3FC', d: 0.5, t: 4.8, s: 6, r: true, x: 10 },
  { l: 47, c: '#FFFFFF', d: 2.1, t: 5.0, s: 7, r: false, x: -10 },
  { l: 60, c: '#FDBA74', d: 0.9, t: 4.2, s: 8, r: true, x: 16 },
  { l: 72, c: '#FDE047', d: 1.7, t: 5.4, s: 6, r: false, x: -12 },
  { l: 84, c: '#C4B5FD', d: 0.3, t: 4.6, s: 8, r: true, x: 8 },
  { l: 94, c: '#FFFFFF', d: 2.4, t: 5.1, s: 7, r: false, x: -8 },
];

/**
 * Everybody's birthday: a celebration card on the day itself, and who is next.
 * Shown to every employee on their attendance page and on the dashboard; renders nothing when there is none.
 */
export const BirthdayCelebrations: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ['birthdays'],
    queryFn: () => customFetch<Birthday[]>('/api/v1/attendance/birthdays?days=30'),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const today = data.filter((b) => b.days_until === 0);
  const next = data.filter((b) => b.days_until > 0).slice(0, 4);
  if (today.length === 0 && next.length === 0) return null;

  return (
    <section aria-label="Birthdays" className={`space-y-4 ${className}`}>
      {today.length > 0 && (
        <div className={`grid gap-4 ${today.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {today.map((b) => {
            const mine = b.emp_id === user?.emp_id;
            const first = b.name.split(/\s+/)[0];
            return (
              <div
                key={b.emp_id}
                className="hol-shine relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 p-5 text-white shadow-lg shadow-orange-500/25"
              >
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
                  {/* balloons drifting on the right */}
                  <div className="absolute bottom-0 right-3 hidden h-full w-40 sm:block">
                    {BALLOONS.map((bl, i) => (
                      <span key={i} className="hol-float absolute bottom-3 flex flex-col items-center" style={{ left: bl.l, animationDelay: bl.d }}>
                        <span className={`block rounded-[50%_50%_48%_48%] ${bl.c} shadow-inner`} style={{ width: bl.h * 0.78, height: bl.h }} />
                        <span className="block h-8 w-px bg-white/60" />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className="hol-float shrink-0 rounded-full p-1 ring-4 ring-white/70">
                    <Avatar name={b.name} src={b.photo_url} size={64} />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
                      <Cake className="h-3.5 w-3.5" /> Birthday today
                    </span>
                    <p className="mt-1.5 truncate text-xl font-bold leading-tight tracking-tight">
                      {mine ? `Happy Birthday, ${first}!` : b.name}
                    </p>
                    <p className="text-sm text-white/90">
                      {mine ? 'Wishing you a wonderful year ahead.' : `Wish ${first} a great day.`}
                    </p>
                  </div>
                </div>

                {!mine && (
                  <div className="relative mt-4">
                    <Link
                      to="/messenger"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Send a wish
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {next.length > 0 && (
        <div className="rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
              <Gift className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Upcoming birthdays</h3>
              <p className="text-xs text-slate-500">In the next 30 days</p>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {next.map((b, i) => {
              const [y, m, d] = b.date.split('-').map(Number);
              const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
              return (
                <li key={b.emp_id} style={{ animationDelay: `${i * 70}ms` }} className="hol-rise flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <Avatar name={b.name} src={b.photo_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{b.name}</p>
                    <p className="truncate text-xs text-slate-500">{label}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{when(b.days_until)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
