/**
 * Which dashboard a signed-in employee gets (BFD VM-004 "Designation-to-dashboard mapping").
 *
 * Roles are free-text names typed by an Admin in Organization Management, so the designation is matched by
 * name: case, punctuation and the "Sr." / "Jr." short forms do not matter. A name that is not in the map gets
 * the General Employee dashboard, which never shows more than the person's own records.
 *
 * Access never comes from the name alone. The Admin dashboard needs an admin role (`roles.is_admin`), the Sales
 * dashboard needs Sales module access (the same rule as SalesAccessGuard: Sales department), and the Project
 * Manager / Expense Approver / Complaint Handler sections need a real assignment. The name only picks the layout.
 */

export type DashboardProfile =
  | 'system_admin'
  | 'sales'
  | 'business_analyst'
  | 'engineering'
  | 'qa'
  | 'design'
  | 'general';

/**
 * Designations whose dashboard (VM-004 sections 02 to 08) needs access the system does not grant yet: company-wide
 * employee, recruitment, payroll and leave data is Admin-only today. Until those permissions are agreed they get the
 * General Employee dashboard, and the page says so.
 */
export type DeferredProfile =
  | 'leadership'
  | 'hr_manager'
  | 'hr_executive'
  | 'recruiter'
  | 'finance_manager'
  | 'accountant'
  | 'payroll_executive';

export interface DashboardProfileInput {
  isAdmin: boolean;
  /** Has Sales module access (SalesAccessGuard rule). */
  isSales: boolean;
  roleName: string | null;
}

export interface DashboardProfileResult {
  profile: DashboardProfile;
  /** Set when the designation has its own dashboard in VM-004 that is not enabled yet. */
  deferred: DeferredProfile | null;
}

const ROLE_MAP: Record<string, DashboardProfile | DeferredProfile> = {
  // 02 Leadership
  ceo: 'leadership',
  'chief executive officer': 'leadership',
  director: 'leadership',
  // 03 to 05 HR
  'hr manager': 'hr_manager',
  'human resources manager': 'hr_manager',
  'hr executive': 'hr_executive',
  'human resources executive': 'hr_executive',
  recruiter: 'recruiter',
  // 06 to 08 Finance
  'finance manager': 'finance_manager',
  accountant: 'accountant',
  'payroll executive': 'payroll_executive',
  // 09 Sales
  'sales head': 'sales',
  'sales manager': 'sales',
  'business development manager': 'sales',
  'business development executive': 'sales',
  'bdm': 'sales',
  'bde': 'sales',
  // 11 Business Analyst
  'business analyst': 'business_analyst',
  // 12 Development / Engineering
  cto: 'engineering',
  'chief technology officer': 'engineering',
  'senior software engineer': 'engineering',
  'software engineer': 'engineering',
  'junior developer': 'engineering',
  'junior software engineer': 'engineering',
  // 13 QA
  'qa manager': 'qa',
  'senior qa engineer': 'qa',
  'qa engineer': 'qa',
  // 14 Design & Creative
  'design head': 'design',
  'graphic designer': 'design',
  'video editor': 'design',
};

const DEFERRED = new Set<string>([
  'leadership',
  'hr_manager',
  'hr_executive',
  'recruiter',
  'finance_manager',
  'accountant',
  'payroll_executive',
]);

/** "Sr. Software Engineer" and "senior  software-engineer" both become "senior software engineer". */
export function normaliseRoleName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w === 'sr' ? 'senior' : w === 'jr' ? 'junior' : w))
    .join(' ');
}

export function resolveDashboardProfile(input: DashboardProfileInput): DashboardProfileResult {
  if (input.isAdmin) return { profile: 'system_admin', deferred: null };

  const mapped = ROLE_MAP[normaliseRoleName(input.roleName)];

  // The Sales dashboard reads Sales module data, so it needs Sales access whatever the role is called.
  if (input.isSales) return { profile: 'sales', deferred: null };
  if (mapped === 'sales') return { profile: 'general', deferred: null };

  if (mapped && DEFERRED.has(mapped)) return { profile: 'general', deferred: mapped as DeferredProfile };
  if (mapped) return { profile: mapped as DashboardProfile, deferred: null };
  return { profile: 'general', deferred: null };
}
