import {
  FIXED_RATING_QUESTIONS,
  RuleError,
  averageOf,
  cycleDates,
  cycleStatus,
  daysLeft,
  finalRating,
  normalizeQuestions,
  validateSubmission,
} from './perf-rules';

describe('perf-rules', () => {
  describe('cycle dates (BFD Section 2 table)', () => {
    it('Yearly 2026 → 1 Jan–31 Dec 2026, window 1–10 Jan 2027', () => {
      expect(cycleDates('YEARLY', 2026)).toMatchObject({
        start: '2026-01-01', end: '2026-12-31', reviewStart: '2027-01-01', reviewEnd: '2027-01-10', name: 'Yearly – 2026',
      });
    });
    it('Quarterly Oct to Dec 2026 → window 1–10 Jan 2027', () => {
      expect(cycleDates('QUARTERLY', 2026, 4)).toMatchObject({
        start: '2026-10-01', end: '2026-12-31', reviewStart: '2027-01-01', reviewEnd: '2027-01-10',
        name: 'Quarterly – Oct to Dec 2026',
      });
    });
    it('Monthly Oct 2026 → window 1–10 Nov 2026', () => {
      expect(cycleDates('MONTHLY', 2026, null, 10)).toMatchObject({
        start: '2026-10-01', end: '2026-10-31', reviewStart: '2026-11-01', reviewEnd: '2026-11-10', name: 'Monthly – Oct 2026',
      });
    });
    it('February in a leap year', () => {
      expect(cycleDates('MONTHLY', 2028, null, 2).end).toBe('2028-02-29');
    });
  });

  describe('status and days left', () => {
    it('derives status from the window', () => {
      expect(cycleStatus('2026-11-01', '2026-11-10', '2026-10-31')).toBe('UPCOMING');
      expect(cycleStatus('2026-11-01', '2026-11-10', '2026-11-01')).toBe('REVIEW_OPEN');
      expect(cycleStatus('2026-11-01', '2026-11-10', '2026-11-10')).toBe('REVIEW_OPEN');
      expect(cycleStatus('2026-11-01', '2026-11-10', '2026-11-11')).toBe('CLOSED');
    });
    it('counts today (Screen 5: closes in 5 days on 6 Nov)', () => {
      expect(daysLeft('2026-11-10', '2026-11-06')).toBe(5);
    });
  });

  describe('questions', () => {
    it('always keeps the 5 fixed questions, even if the client drops or edits them', () => {
      const q = normalizeQuestions([
        { id: 'fixed_comm', title: 'Hacked', is_fixed: true },
        { id: 'x1', title: 'Problem solving', type: 'STAR_RATING' },
      ]);
      expect(q.slice(0, 5).map((x) => x.title)).toEqual(FIXED_RATING_QUESTIONS.map((x) => x.title));
      expect(q[5]).toMatchObject({ title: 'Problem solving', is_required: true, is_fixed: false });
    });
    it('needs at least 2 options for a choice question', () => {
      expect(() => normalizeQuestions([{ title: 'Pick', type: 'SINGLE_CHOICE', options: ['Yes'] }])).toThrow(RuleError);
    });
  });

  describe('submission and averages (BFD Figure 1)', () => {
    const qs = normalizeQuestions([]);
    const all = { fixed_comm: 4, fixed_behav: 5, fixed_regul: 4, fixed_teamw: 3, fixed_qual: 4 };
    it('(4+5+4+3+4) ÷ 5 = 4.0', () => {
      expect(averageOf(qs, all)).toBe(4);
    });
    it('rejects Submit with a missing star', () => {
      const { fixed_qual, ...partial } = all;
      expect(() => validateSubmission(qs, partial, {}, false)).toThrow(
        'Please give a star rating for every question before you submit.',
      );
      expect(validateSubmission(qs, partial, {}, true).ratings).toEqual(partial);
    });
    it('rejects half stars and values outside 1–5', () => {
      expect(() => validateSubmission(qs, { ...all, fixed_comm: 4.5 }, {}, true)).toThrow(RuleError);
      expect(() => validateSubmission(qs, { ...all, fixed_comm: 6 }, {}, true)).toThrow(RuleError);
    });
    it('extra star questions count in the average (BFD 15.6)', () => {
      const withExtra = normalizeQuestions([{ id: 'ps', title: 'Problem solving', type: 'STAR_RATING' }]);
      expect(averageOf(withExtra, { ...all, ps: 1 })).toBe(3.5);
    });
    it('required extra questions must be answered', () => {
      const withText = normalizeQuestions([{ id: 'ach', title: 'Achievement', type: 'SHORT_ANSWER', is_required: true }]);
      expect(() => validateSubmission(withText, all, {}, false)).toThrow('Please answer all required questions.');
    });
    it('Final = (4.0 + 3.8 + 4.2) ÷ 3 = 4.0', () => {
      expect(finalRating(4.0, 3.8, 4.2)).toBe(4);
      expect(finalRating(4.4, 4.0, 4.2)).toBe(4.2);
    });
  });
});
