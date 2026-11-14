import React from 'react';
import { ShieldCheck, Users, CalendarCheck, BarChart3 } from 'lucide-react';
import { Logo } from '@/shared/ui/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const HIGHLIGHTS = [
  { icon: Users, title: 'People & teams', text: 'Employees, departments and roles in one place.' },
  { icon: CalendarCheck, title: 'Attendance & leave', text: 'Live punches, shifts, approvals and holidays.' },
  { icon: BarChart3, title: 'Sales & projects', text: 'Leads, clients and delivery tracked end to end.' },
];

/**
 * Shared shell for every sign-in screen: a brand panel on large screens and a
 * centred form card everywhere. On phones and tablets only the form is shown.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel (large screens) */}
      <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-indigo-500/25 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-lg shadow-black/20">
            <Logo size={30} />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">Vernoxy Pulse</span>
        </div>

        <div className="relative max-w-xl">
          <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
            Run your whole
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent"> organisation </span>
            from one workspace.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
            One secure place for HR, attendance, sales and projects, built for the way your teams actually work.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300 ring-1 ring-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t}</p>
                  <p className="text-sm text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Encrypted sign-in &middot; Enterprise security portal
        </p>
      </aside>

      {/* Form side */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-5 py-10 sm:px-8 lg:bg-none">
        <div className="w-full max-w-[420px]">
          {/* Compact branding for screens without the brand panel */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo size={52} className="mb-3" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Vernoxy Pulse</span>
          </div>

          <div className="mb-7 text-center lg:text-left">
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
            {children}
          </div>

          <footer className="mt-10 text-center text-xs text-slate-400 lg:text-left">
            Vernoxy Pulse &copy; {new Date().getFullYear()} &middot; Enterprise Security Portal
          </footer>
        </div>
      </section>
    </main>
  );
};
