/** Candidate stages: which can be picked straight away, which need a form, and how each one looks. */

/** Stages recorded through their own form (decision, conversion) or reached by the system, never a plain pick */
export const FORM_ONLY_STAGES = ['open', 'selected', 'on_hold', 'rejected', 'onboarding', 'joined', 'did_not_join'];
export const DECISION_STAGES = ['selected', 'on_hold', 'rejected'] as const;

/** A candidate in one of these stages (or one already converted) keeps it: the stage control is disabled */
export function isStageLocked(c: { stage: string; converted_to_emp_id?: number | null }): boolean {
  const s = (c.stage || '').toLowerCase();
  return Boolean(c.converted_to_emp_id) || s === 'onboarding' || s === 'joined';
}

export function isPlainStage(code: string): boolean {
  return !FORM_ONLY_STAGES.includes(code.toLowerCase());
}

const KNOWN: Record<string, { label: string; bg: string; dot: string }> = {
  open: { label: 'Open', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  new: { label: 'New', bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  screening: { label: 'Screening', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  interviewing: { label: 'Interviewing', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  selected: { label: 'Selected', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  onboarding: { label: 'Onboarding', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  joined: { label: 'Joined', bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  did_not_join: { label: 'Did not join', bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  on_hold: { label: 'On Hold', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
};

/** What to tell the Admin after a hiring decision, including whether the regret email went out */
export function decisionResultMessage(u: { name: string; stage: string; regret_email?: 'not_requested' | 'sent' | 'failed' }): {
  kind: 'success' | 'error';
  text: string;
} {
  const label = KNOWN[u.stage]?.label ?? u.stage;
  if (u.stage === 'rejected' && u.regret_email === 'sent') return { kind: 'success', text: `${u.name} was rejected and the regret email was sent.` };
  if (u.stage === 'rejected' && u.regret_email === 'failed') {
    return { kind: 'error', text: `${u.name} was rejected, but the regret email could not be sent. Check the mail settings and try again.` };
  }
  return { kind: 'success', text: `Decision saved: ${u.name} is now ${label}.` };
}

/** The badge for a stage. A stage added in Master Data gets its Master Data label and a neutral colour. */
export function stageBadge(code: string, labels?: Map<string, string>): { label: string; bg: string; dot: string } {
  const c = (code || '').toLowerCase();
  const known = KNOWN[c];
  const label = labels?.get(c) ?? known?.label ?? (code || 'Unknown').replace(/_/g, ' ');
  return known ? { ...known, label } : { label, bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
}
