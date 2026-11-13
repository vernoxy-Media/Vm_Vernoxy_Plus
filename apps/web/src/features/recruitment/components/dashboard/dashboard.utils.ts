import { CandidateItem } from '../../hooks/use-recruitment';

export const OPEN_STAGES = [
  'New',
  'Screening',
  'Interviewing',
  'On Hold',
  'Selected',
  'Onboarding',
] as const;

export const CLOSED_STAGES = [
  'Rejected',
  'Joined',
  'Did not join',
] as const;

export const ALL_STAGES = [...OPEN_STAGES, ...CLOSED_STAGES] as const;

export type RecruitmentStageName = typeof ALL_STAGES[number];

export const STAGE_COLORS: Record<RecruitmentStageName, { hex: string; bg: string; text: string }> = {
  New: { hex: '#38bdf8', bg: 'bg-sky-500', text: 'text-sky-700' },
  Screening: { hex: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-700' },
  Interviewing: { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-700' },
  'On Hold': { hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-700' },
  Selected: { hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-700' },
  Onboarding: { hex: '#a855f7', bg: 'bg-purple-500', text: 'text-purple-700' },
  Rejected: { hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-700' },
  Joined: { hex: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-700' },
  'Did not join': { hex: '#64748b', bg: 'bg-slate-500', text: 'text-slate-700' },
};

export const STANDARD_SOURCES = [
  'Job Portal',
  'LinkedIn',
  'Company Website',
  'Employee Referral',
  'Consultancy',
  'Campus',
  'Walk-in',
  'Social Media',
  'Other',
] as const;

export type CandidateSourceName = typeof STANDARD_SOURCES[number];

export const SOURCE_COLORS: Record<CandidateSourceName, string> = {
  'Job Portal': '#3b82f6',
  'LinkedIn': '#0284c7',
  'Company Website': '#6366f1',
  'Employee Referral': '#8b5cf6',
  'Consultancy': '#ec4899',
  'Campus': '#10b981',
  'Walk-in': '#f59e0b',
  'Social Media': '#06b6d4',
  'Other': '#94a3b8',
};

/** Normalize candidate stage from backend string to standard stage name */
export function normalizeStage(rawStage?: string | null): RecruitmentStageName {
  if (!rawStage) return 'New';
  const clean = rawStage.trim().toLowerCase().replace(/[-_]/g, ' ');

  if (clean === 'new' || clean === 'open') return 'New';
  if (clean === 'screening') return 'Screening';
  if (clean === 'interviewing' || clean === 'interview') return 'Interviewing';
  if (clean === 'on hold' || clean === 'on_hold') return 'On Hold';
  if (clean === 'selected') return 'Selected';
  if (clean === 'onboarding') return 'Onboarding';
  if (clean === 'rejected') return 'Rejected';
  if (clean === 'joined') return 'Joined';
  if (clean === 'did not join' || clean === 'did_not_join' || clean === 'not joined') return 'Did not join';

  return 'New';
}

/** Check if stage is considered Open */
export function isOpenStage(stage: RecruitmentStageName): boolean {
  return (OPEN_STAGES as readonly string[]).includes(stage);
}

/** Normalize candidate source string to one of the 9 exact options */
export function normalizeSource(rawSource?: string | null): CandidateSourceName {
  if (!rawSource) return 'Other';
  const clean = rawSource.trim().toLowerCase().replace(/[-_]/g, ' ');

  if (clean.includes('portal') || clean === 'naukri' || clean === 'indeed' || clean === 'foundit') return 'Job Portal';
  if (clean.includes('linkedin')) return 'LinkedIn';
  if (clean.includes('company website') || clean.includes('website') || clean.includes('career site')) return 'Company Website';
  if (clean.includes('referral') || clean.includes('referred')) return 'Employee Referral';
  if (clean.includes('consultan') || clean.includes('agency')) return 'Consultancy';
  if (clean.includes('campus') || clean.includes('college') || clean.includes('university')) return 'Campus';
  if (clean.includes('walk in') || clean.includes('walkin') || clean.includes('direct')) return 'Walk-in';
  if (clean.includes('social') || clean.includes('facebook') || clean.includes('instagram') || clean.includes('twitter')) return 'Social Media';
  if (clean === 'other') return 'Other';

  return 'Other';
}

/** Normalize experience type to Fresher or Experienced */
export function normalizeExperienceType(raw?: string | null): 'Fresher' | 'Experienced' {
  if (!raw) return 'Experienced';
  const clean = raw.trim().toLowerCase();
  return clean === 'fresher' ? 'Fresher' : 'Experienced';
}

export interface DashboardFilterState {
  stage: string; // 'Open', 'All', or specific stage
  position: string; // 'All' or role_id
  department: string; // 'All' or dep_id
  source: string; // 'All' or specific CandidateSourceName
  experienceType: string; // 'All', 'Fresher', 'Experienced'
  dateRange: {
    startDate: string;
    endDate: string;
    preset: string; // 'all', 'last_30_days', 'last_3_months', 'last_6_months', 'this_year', 'custom'
  };
  searchQuery: string;
}

export const INITIAL_FILTER_STATE: DashboardFilterState = {
  stage: 'Open',
  position: 'All',
  department: 'All',
  source: 'All',
  experienceType: 'All',
  dateRange: {
    startDate: '',
    endDate: '',
    preset: 'all',
  },
  searchQuery: '',
};

/**
 * Filter candidates with AND logic across all global filter categories and search
 */
export function filterCandidates(
  candidates: CandidateItem[],
  filters: DashboardFilterState
): CandidateItem[] {
  return candidates.filter((cand) => {
    // 1. Stage Filter
    const stageNorm = normalizeStage(cand.stage);
    if (filters.stage === 'Open') {
      if (!isOpenStage(stageNorm)) return false;
    } else if (filters.stage !== 'All' && filters.stage !== '') {
      if (stageNorm.toLowerCase() !== filters.stage.toLowerCase()) return false;
    }

    // 2. Position Filter (role_id)
    if (filters.position !== 'All' && filters.position !== '') {
      if (String(cand.role_id) !== String(filters.position)) return false;
    }

    // 3. Department Filter (dep_id)
    if (filters.department !== 'All' && filters.department !== '') {
      if (String(cand.dep_id) !== String(filters.department)) return false;
    }

    // 4. Source Filter
    if (filters.source !== 'All' && filters.source !== '') {
      const srcNorm = normalizeSource(cand.source);
      if (srcNorm.toLowerCase() !== filters.source.toLowerCase()) return false;
    }

    // 5. Experience Type Filter
    if (filters.experienceType !== 'All' && filters.experienceType !== '') {
      const expNorm = normalizeExperienceType(cand.experience_type);
      if (expNorm.toLowerCase() !== filters.experienceType.toLowerCase()) return false;
    }

    // 6. Date Range Filter (Candidate creation date)
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      if (!cand.created_at) return false;
      const candDate = new Date(cand.created_at);
      if (isNaN(candDate.getTime())) return false;

      if (filters.dateRange.startDate) {
        const start = new Date(filters.dateRange.startDate);
        start.setHours(0, 0, 0, 0);
        if (candDate < start) return false;
      }

      if (filters.dateRange.endDate) {
        const end = new Date(filters.dateRange.endDate);
        end.setHours(23, 59, 59, 999);
        if (candDate > end) return false;
      }
    }

    // 7. Global Search (Search across Candidate ID, Name, Phone, Email, Position, Dept, Source)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      const code = (cand.candidate_code || '').toLowerCase();
      const id = String(cand.candidate_id || '');
      const name = (cand.name || '').toLowerCase();
      const phone = (cand.phone || '').toLowerCase();
      const email = (cand.email || '').toLowerCase();
      const position = (cand.role_name || '').toLowerCase();
      const dept = (cand.department_name || '').toLowerCase();
      const source = (cand.source || '').toLowerCase();
      const normalizedSrc = normalizeSource(cand.source).toLowerCase();

      const matches =
        code.includes(q) ||
        id.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        position.includes(q) ||
        dept.includes(q) ||
        source.includes(q) ||
        normalizedSrc.includes(q);

      if (!matches) return false;
    }

    return true;
  });
}

/** Calculate percentage safely */
export function calculatePercentage(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  const p = (count / total) * 100;
  return Math.round(p * 10) / 10;
}
