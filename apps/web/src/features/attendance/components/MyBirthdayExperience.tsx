import React, { useEffect, useMemo, useState } from 'react';
import { Cake, X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useIsMyBirthday } from '../hooks/use-birthdays';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const seen = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const markSeen = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* private mode: it just shows again on the next visit */
  }
};

const COLORS = ['#F472B6', '#FACC15', '#38BDF8', '#A78BFA', '#FB923C', '#34D399', '#FB7185', '#FFFFFF'];

/** A shower of confetti over the whole screen, once a day on your own birthday. It never blocks a click. */
export const BirthdayConfettiBurst: React.FC = () => {
  const { user } = useAuth();
  const mine = useIsMyBirthday();
  const key = `bday-confetti-${user?.emp_id}-${todayKey()}`;
  const [show, setShow] = useState(false);

  // Fixed positions, so the shower looks the same on every render
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        l: (i * 37) % 100,
        c: COLORS[i % COLORS.length],
        d: ((i * 53) % 18) / 10,
        t: 3.2 + ((i * 29) % 20) / 10,
        s: 6 + ((i * 7) % 7),
        round: i % 3 === 0,
        x: ((i * 41) % 120) - 60,
      })),
    [],
  );

  useEffect(() => {
    if (!mine || seen(key)) return;
    markSeen(key);
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 7000);
    return () => window.clearTimeout(t);
  }, [mine, key]);

  if (!show) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`bday-fall absolute top-0 block ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={
            {
              left: `${p.l}%`,
              width: p.s,
              height: p.round ? p.s : p.s * 1.7,
              background: p.c,
              '--bd-delay': `${p.d}s`,
              '--bd-dur': `${p.t}s`,
              '--bd-drift': `${p.x}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

/** A slim greeting across the top of every page on your own birthday. It can be closed for the day. */
export const MyBirthdayBanner: React.FC = () => {
  const { user } = useAuth();
  const mine = useIsMyBirthday();
  const key = `bday-banner-${user?.emp_id}-${todayKey()}`;
  const [closed, setClosed] = useState(() => seen(key));

  if (!mine || !user || closed) return null;
  const first = user.name.split(/\s+/)[0];
  return (
    <div className="hol-shine relative mb-4 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-4 py-3 text-white shadow-lg shadow-fuchsia-500/20">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/25 backdrop-blur">
        <Cake className="h-5 w-5" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-bold">Happy Birthday, {first}!</span>
        <span className="text-white/90"> The whole team is wishing you a wonderful day.</span>
      </p>
      <button
        type="button"
        onClick={() => {
          markSeen(key);
          setClosed(true);
        }}
        className="relative z-10 shrink-0 rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
        aria-label="Close the birthday greeting"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
