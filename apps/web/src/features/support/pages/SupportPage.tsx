import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, CalendarOff, Check, ClipboardCopy, Clock, Laptop, LifeBuoy, MessageCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

/** Where to go for what. Every card opens a module that already exists and that every employee may use. */
const HELP_CARDS: Array<{ to: string; title: string; text: string; icon: React.ElementType; chip: string }> = [
  {
    to: '/complaints',
    title: 'Report a problem',
    text: 'Raise a complaint or an issue and follow it until it is resolved.',
    icon: AlertCircle,
    chip: 'bg-rose-50 text-rose-600',
  },
  {
    to: '/knowledge-base',
    title: 'Find an answer',
    text: 'Read the articles and guides your company has written.',
    icon: BookOpen,
    chip: 'bg-blue-50 text-blue-600',
  },
  {
    to: '/messenger',
    title: 'Message your admin or HR',
    text: 'Ask a question in a chat and get a reply in the same place.',
    icon: MessageCircle,
    chip: 'bg-purple-50 text-purple-600',
  },
  {
    to: '/attendance',
    title: 'Fix an attendance entry',
    text: 'Missed a punch? Ask for a correction from your attendance records.',
    icon: Clock,
    chip: 'bg-emerald-50 text-emerald-600',
  },
  {
    to: '/leave',
    title: 'Leave questions',
    text: 'Apply for leave, check your balance and see where a request stands.',
    icon: CalendarOff,
    chip: 'bg-amber-50 text-amber-600',
  },
  {
    to: '/licenses',
    title: 'Software and licenses',
    text: 'See the software you hold and ask for what you need.',
    icon: Laptop,
    chip: 'bg-slate-100 text-slate-600',
  },
];

/**
 * Help & Support, open to every signed-in employee. It used to send everyone to Recruitment, which only administrators
 * may open, so a normal user saw "Access Denied".
 */
export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const details = [
    `Name: ${user?.name ?? '-'}`,
    `Employee ID: ${user?.emp_id ?? '-'}`,
    `Email: ${user?.email ?? '-'}`,
    `Role: ${user?.role?.role_name ?? '-'}`,
    `Department: ${user?.department?.name ?? '-'}`,
    `Page: ${typeof window !== 'undefined' ? window.location.origin : ''}`,
  ].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the browser refused: the details are still on screen to copy by hand */
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <LifeBuoy className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Help &amp; Support</h1>
          <p className="mt-0.5 text-sm text-slate-500">Choose what you need. If it is not here, message your admin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.chip}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{c.title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">{c.text}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5" aria-labelledby="support-details">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="support-details" className="text-sm font-bold text-slate-900">Your details</h2>
            <p className="mt-0.5 text-xs text-slate-500">Copy these into a message when you ask for help, so nobody has to ask who you are.</p>
          </div>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy details'}
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
          {[
            ['Name', user?.name],
            ['Employee ID', user?.emp_id],
            ['Email', user?.email],
            ['Role', user?.role?.role_name],
            ['Department', user?.department?.name],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex gap-3">
              <dt className="w-24 shrink-0 text-xs font-semibold text-slate-500">{label}</dt>
              <dd className="min-w-0 truncate text-slate-900">{value ?? '-'}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};
