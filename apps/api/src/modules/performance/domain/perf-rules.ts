/**
 * Pure Performance Management rules (BFD 1.0). No database access here.
 */

export type CycleType = 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
export type CycleStatus = 'UPCOMING' | 'REVIEW_OPEN' | 'CLOSED';
export type QuestionType = 'STAR_RATING' | 'SHORT_ANSWER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export interface PerfQuestion {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  options?: Array<{ value: string; label: string }>;
  is_fixed: boolean;
  is_required: boolean;
  display_order: number;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const QUARTER_LABELS = ['Jan to Mar', 'Apr to Jun', 'Jul to Sep', 'Oct to Dec'];

/** BFD Section 2: the 5 fixed rating questions. Always in every form; cannot be removed. */
export const FIXED_RATING_QUESTIONS: PerfQuestion[] = [
  { id: 'fixed_comm', title: 'Communication', description: 'How clearly and politely the employee shares ideas and information.' },
  { id: 'fixed_behav', title: 'Behaviour', description: 'How respectful and professional the employee is with others.' },
  { id: 'fixed_regul', title: 'Regularity', description: 'How regular the employee is in attendance and in keeping to time.' },
  { id: 'fixed_teamw', title: 'Teamwork', description: 'How well the employee works with others.' },
  { id: 'fixed_qual', title: 'Quality of Work', description: 'How accurate and complete the employee’s work is.' },
].map((q, i) => ({ ...q, type: 'STAR_RATING' as const, is_fixed: true, is_required: true, display_order: i + 1 }));

const FIXED_IDS = new Set(FIXED_RATING_QUESTIONS.map((q) => q.id));

/** Today as YYYY-MM-DD in the company timezone (Asia/Kolkata). */
export function todayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function ymd(y: number, m0: number, d: number): string {
  return new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10);
}

/** "10 Nov 2026" */
export function fmtDate(d: Date | string): string {
  const s = toDateStr(d);
  const [y, m, day] = s.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "10 Nov" */
export function fmtDayMonth(d: Date | string): string {
  const s = toDateStr(d);
  const [, m, day] = s.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[m - 1]}`;
}

/** BFD Section 2 & 3: the system fills the dates, the review window and the name. */
export function cycleDates(type: CycleType, year: number, quarter?: number | null, month?: number | null) {
  let startM0: number;
  let endM0: number;
  let name: string;
  let periodLabel: string;
  if (type === 'YEARLY') {
    startM0 = 0;
    endM0 = 11;
    name = `Yearly – ${year}`;
    periodLabel = `${year}`;
  } else if (type === 'QUARTERLY') {
    if (!quarter || quarter < 1 || quarter > 4) throw new Error('QUARTER_REQUIRED');
    startM0 = (quarter - 1) * 3;
    endM0 = startM0 + 2;
    name = `Quarterly – ${QUARTER_LABELS[quarter - 1]} ${year}`;
    periodLabel = `${QUARTER_LABELS[quarter - 1]} ${year}`;
  } else {
    if (!month || month < 1 || month > 12) throw new Error('MONTH_REQUIRED');
    startM0 = month - 1;
    endM0 = month - 1;
    name = `Monthly – ${MONTHS_SHORT[month - 1]} ${year}`;
    periodLabel = `${MONTHS_SHORT[month - 1]} ${year}`;
  }
  const start = ymd(year, startM0, 1);
  const end = ymd(year, endM0 + 1, 0);
  // Review window: 1st to 10th of the month after the cycle ends.
  const reviewStart = ymd(year, endM0 + 1, 1);
  const reviewEnd = ymd(year, endM0 + 1, 10);
  return { start, end, reviewStart, reviewEnd, name, periodLabel };
}

/** Short period label used in messages, e.g. "Oct 2026", "Oct to Dec 2026", "2026". */
export function periodLabel(c: { cycle_type: string; year: number; quarter?: number | null; month?: number | null }): string {
  return cycleDates(c.cycle_type as CycleType, c.year, c.quarter, c.month).periodLabel;
}

/** Status is always derived from the dates (BFD Screen 1). */
export function cycleStatus(reviewStart: Date | string, reviewEnd: Date | string, today = todayStr()): CycleStatus {
  const s = toDateStr(reviewStart);
  const e = toDateStr(reviewEnd);
  if (today < s) return 'UPCOMING';
  if (today > e) return 'CLOSED';
  return 'REVIEW_OPEN';
}

/** Whole days left in the window, counting today (10 Nov when today is 6 Nov = 5). */
export function daysLeft(reviewEnd: Date | string, today = todayStr()): number {
  const e = Date.parse(`${toDateStr(reviewEnd)}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round((e - t) / 86400000) + 1);
}

export class RuleError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

/**
 * Builds the stored question list: the 5 fixed questions first (always the
 * system copy, so they cannot be edited or removed), then Admin's extra questions.
 */
export function normalizeQuestions(input: any[] | undefined): PerfQuestion[] {
  const extras = (Array.isArray(input) ? input : []).filter((q) => q && !q.is_fixed && !FIXED_IDS.has(String(q.id)));
  const seen = new Set<string>(FIXED_IDS);
  const out: PerfQuestion[] = FIXED_RATING_QUESTIONS.map((q) => ({ ...q }));
  extras.forEach((q, i) => {
    const title = String(q.title ?? '').trim();
    if (!title) throw new RuleError('Please write the question for every extra question.', 'questions');
    const type: QuestionType = ['STAR_RATING', 'SHORT_ANSWER', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type)
      ? q.type
      : 'SHORT_ANSWER';
    let options: Array<{ value: string; label: string }> = [];
    if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
      options = (Array.isArray(q.options) ? q.options : [])
        .map((o: any) => (typeof o === 'string' ? o : o?.label ?? o?.value ?? ''))
        .map((s: string) => String(s).trim())
        .filter(Boolean)
        .map((s: string) => ({ value: s, label: s }));
      if (options.length < 2) {
        throw new RuleError(`Please add at least 2 options for "${title}".`, 'questions');
      }
    }
    let id = String(q.id ?? '').trim();
    if (!/^[a-zA-Z0-9_-]{1,60}$/.test(id) || seen.has(id)) id = `q_${Date.now().toString(36)}_${i}`;
    seen.add(id);
    out.push({
      id,
      title: title.slice(0, 300),
      description: String(q.description ?? '').trim().slice(0, 500),
      type,
      options,
      is_fixed: false,
      // Star rating questions are always compulsory (BFD Screen 4).
      is_required: type === 'STAR_RATING' ? true : Boolean(q.is_required ?? q.required),
      display_order: FIXED_RATING_QUESTIONS.length + i + 1,
    });
  });
  return out;
}

export function starQuestions(questions: PerfQuestion[]): PerfQuestion[] {
  return (questions || []).filter((q) => q.is_fixed || q.type === 'STAR_RATING');
}

/**
 * Checks ratings and answers against the form. On a draft only the values
 * given are checked; on Submit every star and required question is needed.
 */
export function validateSubmission(
  questions: PerfQuestion[],
  ratings: Record<string, any> = {},
  answers: Record<string, any> = {},
  isDraft: boolean,
) {
  const stars = starQuestions(questions);
  const cleanRatings: Record<string, number> = {};
  for (const q of stars) {
    const v = ratings[q.id];
    if (v === undefined || v === null || v === '' || v === 0) continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new RuleError('Star ratings must be whole stars from 1 to 5.', 'ratings');
    }
    cleanRatings[q.id] = n;
  }
  const cleanAnswers: Record<string, any> = {};
  for (const q of questions.filter((x) => !x.is_fixed && x.type !== 'STAR_RATING')) {
    const v = answers[q.id];
    if (q.type === 'MULTIPLE_CHOICE') {
      const arr = (Array.isArray(v) ? v : v ? [v] : []).map(String);
      const allowed = new Set((q.options || []).map((o) => o.value));
      if (arr.some((a) => !allowed.has(a))) throw new RuleError('Please choose from the given options.', 'answers');
      if (arr.length) cleanAnswers[q.id] = arr;
    } else if (q.type === 'SINGLE_CHOICE') {
      if (v !== undefined && v !== null && v !== '') {
        const allowed = new Set((q.options || []).map((o) => o.value));
        if (!allowed.has(String(v))) throw new RuleError('Please choose from the given options.', 'answers');
        cleanAnswers[q.id] = String(v);
      }
    } else if (typeof v === 'string' && v.trim()) {
      cleanAnswers[q.id] = v.trim().slice(0, 2000);
    }
  }
  if (!isDraft) {
    if (stars.some((q) => cleanRatings[q.id] === undefined)) {
      throw new RuleError('Please give a star rating for every question before you submit.', 'ratings');
    }
    const missing = questions.filter(
      (q) => !q.is_fixed && q.type !== 'STAR_RATING' && q.is_required && cleanAnswers[q.id] === undefined,
    );
    if (missing.length) throw new RuleError('Please answer all required questions.', 'answers');
  }
  return { ratings: cleanRatings, answers: cleanAnswers };
}

/** Average = total stars given ÷ number of rating questions, one decimal (BFD Section 2). */
export function averageOf(questions: PerfQuestion[], ratings: Record<string, number>): number | null {
  const stars = starQuestions(questions);
  if (!stars.length || stars.some((q) => !ratings[q.id])) return null;
  const total = stars.reduce((sum, q) => sum + Number(ratings[q.id]), 0);
  return round1(total / stars.length);
}

/** Final Rating = (Self + Manager + Admin) ÷ 3, one decimal. */
export function finalRating(self: number, manager: number, admin: number): number {
  return round1((Number(self) + Number(manager) + Number(admin)) / 3);
}

export function round1(n: number): number {
  return Math.round(n * 10 + Number.EPSILON) / 10;
}
