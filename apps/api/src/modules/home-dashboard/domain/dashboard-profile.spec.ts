import { normaliseRoleName, resolveDashboardProfile } from './dashboard-profile';

const user = (roleName: string | null, extra: Partial<{ isAdmin: boolean; isSales: boolean }> = {}) =>
  resolveDashboardProfile({ isAdmin: false, isSales: false, roleName, ...extra });

describe('normaliseRoleName', () => {
  it('ignores case, punctuation, spacing and the Sr. / Jr. short forms', () => {
    expect(normaliseRoleName('Sr. Software Engineer')).toBe('senior software engineer');
    expect(normaliseRoleName('  JR-Developer ')).toBe('junior developer');
    expect(normaliseRoleName('QA  Engineer')).toBe('qa engineer');
    expect(normaliseRoleName(null)).toBe('');
  });
});

describe('resolveDashboardProfile', () => {
  it('gives an admin role the System Admin dashboard whatever it is called', () => {
    expect(user('Owner', { isAdmin: true })).toEqual({ profile: 'system_admin' });
    expect(user('Sales Manager', { isAdmin: true, isSales: true }).profile).toBe('system_admin');
  });

  it('maps the designations of VM-004 to their dashboards', () => {
    expect(user('Business Analyst').profile).toBe('business_analyst');
    expect(user('Sr. Software Engineer').profile).toBe('engineering');
    expect(user('Jr. Developer').profile).toBe('engineering');
    expect(user('CTO').profile).toBe('engineering');
    expect(user('Senior QA Engineer').profile).toBe('qa');
    expect(user('Video Editor').profile).toBe('design');
  });

  it('gives HR, Recruiter, Finance and Leadership designations their own dashboards', () => {
    expect(user('HR Manager').profile).toBe('hr_manager');
    expect(user('HR Executive').profile).toBe('hr_executive');
    expect(user('Recruiter').profile).toBe('recruiter');
    expect(user('Finance Manager').profile).toBe('finance_manager');
    expect(user('Accountant').profile).toBe('accountant');
    expect(user('Payroll Executive').profile).toBe('payroll_executive');
    expect(user('CEO').profile).toBe('leadership');
    expect(user('Director').profile).toBe('leadership');
  });

  it('gives the Sales dashboard only to people with Sales module access', () => {
    expect(user('Business Development Executive', { isSales: true }).profile).toBe('sales');
    expect(user('Sales Manager').profile).toBe('general');
    expect(user('Telecaller', { isSales: true }).profile).toBe('sales');
  });

  it('falls back to the General dashboard for unknown or missing roles', () => {
    expect(user('Manager')).toEqual({ profile: 'general' });
    expect(user('Project Manager')).toEqual({ profile: 'general' });
    expect(user(null)).toEqual({ profile: 'general' });
  });
});
