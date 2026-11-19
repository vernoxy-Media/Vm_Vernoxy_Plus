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
    expect(user('Owner', { isAdmin: true })).toEqual({ profile: 'system_admin', deferred: null });
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

  it('gives the Sales dashboard only to people with Sales module access', () => {
    expect(user('Business Development Executive', { isSales: true }).profile).toBe('sales');
    expect(user('Sales Manager').profile).toBe('general');
    // A Sales department employee with a role name that is not in the map still uses the Sales module
    expect(user('Telecaller', { isSales: true }).profile).toBe('sales');
  });

  it('keeps HR, Finance and Leadership on the General dashboard until their access is agreed', () => {
    expect(user('HR Manager')).toEqual({ profile: 'general', deferred: 'hr_manager' });
    expect(user('Recruiter')).toEqual({ profile: 'general', deferred: 'recruiter' });
    expect(user('Payroll Executive')).toEqual({ profile: 'general', deferred: 'payroll_executive' });
    expect(user('Director')).toEqual({ profile: 'general', deferred: 'leadership' });
  });

  it('falls back to the General dashboard for unknown or missing roles', () => {
    expect(user('Manager')).toEqual({ profile: 'general', deferred: null });
    expect(user('Project Manager')).toEqual({ profile: 'general', deferred: null });
    expect(user(null)).toEqual({ profile: 'general', deferred: null });
  });
});
