import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AxeBuilder from '@axe-core/playwright';
import { setupPlaywrightUser, setupNonAdminPlaywrightUser } from '../../../scripts/setup-playwright-user';

const TEST_ADMIN_EMAIL = 'playwright_test@vernoxy.com';
const TEST_ADMIN_PASSWORD = 'PlaywrightP@ssw0rd123!';
const TEST_NONADMIN_EMAIL = 'playwright_nonadmin@vernoxy.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureDir = path.resolve(__dirname, 'fixtures');
const validPhotoPath = path.join(fixtureDir, 'test-avatar.png');
const screenshotDir = path.resolve(__dirname, '../../../logs/screenshots');

async function clearMailpit() {
  try {
    await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to clear mailpit:', err);
  }
}

async function getLatestMailpitOtp(email: string, maxRetries = 25): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:8025/api/v1/messages');
      if (res.ok) {
        const data = await res.json();
        const msgs = (data.messages || []).filter((m: any) =>
          (m.To || []).some((to: any) => to.Address.toLowerCase() === email.toLowerCase())
        );
        if (msgs.length > 0) {
          const msg = msgs[0];
          const content = `${msg.Snippet || ''} ${msg.Text || ''}`;
          const match = content.match(/\b\d{6}\b/);
          if (match) return match[0];
        }
      }
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for OTP email in Mailpit for ${email}`);
}

async function loginAsAdmin(page: any) {
  await clearMailpit();
  await page.goto('/login');
  await page.fill('#email', TEST_ADMIN_EMAIL);
  await page.fill('#password', TEST_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/login\/verify/);
  const otp = await getLatestMailpitOtp(TEST_ADMIN_EMAIL);
  await page.fill('#otp-code-input', otp);
  await page.click('#verify-submit-button');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#user-display-name')).toHaveText('Playwright Tester');
  await clearMailpit();
}

async function loginAsNonAdmin(page: any) {
  await clearMailpit();
  await page.goto('/login');
  await page.fill('#email', TEST_NONADMIN_EMAIL);
  await page.fill('#password', TEST_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/login\/verify/);
  const otp = await getLatestMailpitOtp(TEST_NONADMIN_EMAIL);
  await page.fill('#otp-code-input', otp);
  await page.click('#verify-submit-button');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#user-display-name')).toHaveText('Playwright Non-Admin');
  await clearMailpit();
}

test.describe('Admin UI Refactor: Single-Page Employee Form & Settings Master Data', () => {
  test.beforeEach(async () => {
    await clearMailpit();
    await setupPlaywrightUser(TEST_ADMIN_PASSWORD);
  });

  test('1. Single-Page Form: full creation flow, dependent roles, empty state link, handover modal, and 1440px screenshots', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);

    // Step A: Create an empty department in Settings to test the empty state link
    await page.goto('/admin/settings/departments');
    await expect(page).toHaveURL(/\/admin\/settings\/departments/);
    await page.screenshot({ path: path.join(screenshotDir, 'settings_departments_1440px.png') });

    const emptyDepName = `Empty Dep ${Date.now()}`;
    await page.click('#add-department-button');
    await page.fill('#department-name-input', emptyDepName);
    await page.click('#department-submit-button');

    // Filter to this department to verify it appears
    await page.fill('#departments-search-input', emptyDepName);
    await expect(page.locator(`text=${emptyDepName}`)).toBeVisible();

    // Step B: Navigate to /admin/employees/new
    await page.goto('/admin/employees/new');
    await expect(page.locator('h1')).toContainText('Add Employee');

    // Verify visual design: header has back button, breadcrumb, single card, 3 stacked sections
    await expect(page.locator('#page-header-back-button')).toBeVisible();
    await expect(page.locator('text=ABOUT EMPLOYEE')).toBeVisible();
    await expect(page.locator('text=JOB DETAILS')).toBeVisible();
    await expect(page.locator('text=ACCOUNT PASSWORD')).toBeVisible();

    // Verify tabs, Next/Back buttons, and Review tab are completely REMOVED
    await expect(page.locator('#step-tab-personal')).not.toBeVisible();
    await expect(page.locator('#step-tab-work')).not.toBeVisible();
    await expect(page.locator('#step-tab-access')).not.toBeVisible();
    await expect(page.locator('#step-tab-review')).not.toBeVisible();
    await expect(page.locator('#step-next-button')).not.toBeVisible();

    // Take screenshot of Add Employee single-page form at 1440px
    await page.screenshot({ path: path.join(screenshotDir, 'add_employee_1440px.png') });

    // Step C: Dependent role select behavior
    const roleSelect = page.locator('#employee-role-select');
    await expect(roleSelect).toBeDisabled();
    await expect(roleSelect).toContainText('Select a department first');

    // Select the newly created empty department
    const depSelect = page.locator('#employee-dep-select');
    await depSelect.selectOption({ label: emptyDepName });

    // Expect empty state message and link to Settings > Roles with pre-selected dep
    const emptyStateLink = page.locator(`a[href*="/admin/settings/roles?dep_id="]`);
    await expect(emptyStateLink).toBeVisible();
    await expect(page.locator('text=No roles in this department')).toBeVisible();

    // Click link to create a role for this department
    await emptyStateLink.click();
    await expect(page).toHaveURL(/\/admin\/settings\/roles\?dep_id=\d+&new=1/);

    // Verify Add Role dialog is automatically OPENED and department is pre-selected
    await expect(page.locator('text=New Role')).toBeVisible();
    const newRoleName = `Dev_${Date.now()}`;
    await page.fill('#role-name-input', newRoleName);
    await page.click('#role-submit-button');
    await expect(page.locator(`text=${newRoleName}`)).toBeVisible();

    // Take screenshot of Roles settings section at 1440px
    await page.screenshot({ path: path.join(screenshotDir, 'settings_roles_1440px.png') });

    // Step D: Return to Add Employee and complete the employee creation
    await page.goto('/admin/employees/new');

    // Fill Section 1: About Employee
    const testEmpEmail = `single_form_${Date.now()}@vernoxy.com`;
    await page.fill('#employee-name-input', 'Marcus Vance');
    await page.fill('#employee-email-input', testEmpEmail);
    const testEmpMob = `+1${Date.now().toString().slice(-10)}`;
    await page.fill('#employee-mob-input', testEmpMob);

    // Photo picker valid photo
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#photo-picker-upload-button');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(validPhotoPath);

    // Fill Section 2: Job Details
    await expect(page.locator('#employee-dep-select option', { hasText: 'Admin' })).toBeAttached();
    await depSelect.selectOption({ label: 'Admin' });
    await expect(roleSelect).toBeEnabled();
    await roleSelect.selectOption({ label: 'Admin' });

    // Verify changing department clears the role
    await depSelect.selectOption({ value: '' });
    await expect(roleSelect).toBeDisabled();
    await expect(roleSelect).toHaveValue(''); // cleared!

    // Re-select Admin and Admin role
    await depSelect.selectOption({ label: 'Admin' });
    await expect(roleSelect).toBeEnabled();
    await roleSelect.selectOption({ label: 'Admin' });

    // Fill Section 3: Account Password
    await page.click('#employee-generate-password-btn');
    const pwdValue = await page.inputValue('#employee-password-input');
    expect(pwdValue.length).toBe(16);

    await page.click('#employee-copy-password-btn');
    await expect(page.locator('text=Copied')).toBeVisible();

    // Toggle require password change
    await page.click('label:has(#employee-must-change-password-toggle)');

    // Submit form via sticky footer "Create employee" button
    await page.click('#employee-form-submit-btn');

    // Step E: Handover Panel
    const handoverPanel = page.locator('#handover-credentials-panel');
    await expect(handoverPanel).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: path.join(screenshotDir, 'handover_panel_1440px.png') });

    await expect(handoverPanel.locator(`text=${testEmpEmail}`)).toBeVisible();
    await expect(handoverPanel.locator(`text=${pwdValue}`)).toBeVisible();

    // Copy credentials
    await page.click('#handover-copy-btn');
    await expect(page.locator('text=Copied to Clipboard!')).toBeVisible();

    // Click "View employees"
    await page.click('#handover-view-employees-btn');
    await expect(page).toHaveURL(/\/admin\/employees/);
    await page.fill('#employees-search-input', 'Marcus Vance');
    await expect(page.locator('text=Marcus Vance').first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'employees_list_1440px.png') });
  });

  test('2. Error summary focuses first invalid field and duplicate email error maps under Email', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/employees/new');

    // Submit completely empty form
    await page.click('#employee-form-submit-btn');

    // Validation error summary appears at top with aria-live="polite"
    const errorSummary = page.locator('#form-error-summary');
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toHaveAttribute('aria-live', 'polite');

    // First invalid field (#employee-name-input) is automatically focused
    await expect(page.locator('#employee-name-input')).toBeFocused();

    // Clicking an error link inside the summary focuses that specific field
    const emailErrorBtn = errorSummary.locator('button:has-text("Work email is required")');
    await emailErrorBtn.click();
    await expect(page.locator('#employee-email-input')).toBeFocused();

    // Test duplicate email mapping
    await page.fill('#employee-name-input', 'Duplicate User');
    await page.fill('#employee-email-input', TEST_ADMIN_EMAIL);
    await page.locator('#employee-dep-select').selectOption({ label: 'Admin' });
    await expect(page.locator('#employee-role-select')).toBeEnabled();
    await page.locator('#employee-role-select').selectOption({ label: 'Admin' });
    await page.click('#employee-generate-password-btn');

    await page.click('#employee-form-submit-btn');

    // Server returns EMAIL_TAKEN -> mapped under Email field and focused
    const emailInput = page.locator('#employee-email-input');
    await expect(page.locator('p:has-text("This email is already registered")')).toBeVisible();
    await expect(emailInput).toBeFocused();
  });

  test('3. Unsaved changes warning before leaving', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/employees/new');

    // Dirty the form
    await page.fill('#employee-name-input', 'Dirty Name Unsaved');

    // Register beforeunload handler check
    const isDirty = await page.evaluate(() => {
      let triggered = false;
      window.addEventListener('beforeunload', () => {
        triggered = true;
      });
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(isDirty).toBe(true);
  });

  test('4. Photo upload failure fallback shows retry warning in handover modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/employees/new');
    await expect(page.locator('#employee-name-input')).toBeVisible();

    // Select valid photo
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#photo-picker-upload-button');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(validPhotoPath);

    const empEmail = `photo_fail_${Date.now()}@vernoxy.com`;
    await page.fill('#employee-name-input', 'Photo Failure Test');
    await page.fill('#employee-email-input', empEmail);
    await page.locator('#employee-dep-select').selectOption({ label: 'Admin' });
    await expect(page.locator('#employee-role-select')).toBeEnabled();
    await page.locator('#employee-role-select').selectOption({ label: 'Admin' });
    await page.click('#employee-generate-password-btn');

    // Mock photo upload route failure
    await page.route('**/api/v1/employees/*/photo', (route) => {
      route.abort('failed');
    });

    await page.click('#employee-form-submit-btn');

    // Employee is created anyway and handover panel appears with photo warning
    const handoverPanel = page.locator('#handover-credentials-panel');
    await expect(handoverPanel).toBeVisible();
    await expect(page.locator('#photo-upload-warning')).toBeVisible();
    await expect(page.locator('#retry-photo-upload-btn')).toBeVisible();
  });

  test('5. Edit Employee Page: single form without Email and without Password section', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('#nav-employees');
    await expect(page).toHaveURL(/\/admin\/employees/);
    await expect(page.locator('h1')).toContainText('Employees');

    const editBtn = page.locator('a[id^="edit-employee-"]').first();
    await editBtn.click();
    await expect(page).toHaveURL(/\/admin\/employees\/\d+\/edit/);

    // Verify single-page layout on Edit
    await expect(page.locator('h1')).toContainText('Edit Employee');
    await expect(page.locator('text=ABOUT EMPLOYEE')).toBeVisible();
    await expect(page.locator('text=JOB DETAILS')).toBeVisible();

    // Verify Email and Account Password sections do NOT exist on Edit
    await expect(page.locator('#employee-email-input')).not.toBeVisible();
    await expect(page.locator('text=ACCOUNT PASSWORD')).not.toBeVisible();
    await expect(page.locator('#employee-password-input')).not.toBeVisible();

    // Verify status select is present
    await expect(page.locator('#employee-status-select')).toBeVisible();
  });

  test('6. Settings: sidebar link, registry data-driven sections, redirects, and CRUD with IN_USE guard', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to settings via sidebar
    await page.click('#nav-settings');
    await expect(page).toHaveURL(/\/admin\/settings\/departments/);

    // Sidebar verification: Home, Employees, Settings (gear icon)
    // Separate Departments and Roles items are REMOVED
    await expect(page.locator('#nav-settings')).toBeVisible();
    await expect(page.locator('#nav-departments')).not.toBeVisible();
    await expect(page.locator('#nav-roles')).not.toBeVisible();
    await expect(page.locator('#nav-settings')).toHaveClass(/bg-blue-50/);

    // Backward-compatibility redirects
    await page.goto('/admin/departments');
    await expect(page).toHaveURL(/\/admin\/settings\/departments/);

    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/\/admin\/settings\/roles/);

    // Test tab navigation between sections
    await page.click('#settings-tab-departments');
    await expect(page).toHaveURL(/\/admin\/settings\/departments/);

    // Test browser back button and refresh preservation
    await page.click('#settings-tab-roles');
    await expect(page).toHaveURL(/\/admin\/settings\/roles/);
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/settings\/roles/);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/settings\/departments/);

    // Test Delete Department with IN_USE message
    const deleteBtn = page.locator('button[id^="delete-department-"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(page.locator('text=Delete Department?')).toBeVisible();
      await page.click('#confirm-delete-department-button');
      await expect(page.locator('text=cannot be deleted because it')).toBeVisible();
    }
  });

  test('7. Non-admin user access: no Settings in sidebar and redirected/denied on URL navigation', async ({ page }) => {
    await setupNonAdminPlaywrightUser(TEST_ADMIN_PASSWORD);
    await loginAsNonAdmin(page);

    // Non-admin does NOT see Settings in sidebar
    await expect(page.locator('#nav-settings')).not.toBeVisible();

    // Navigating directly to /admin/settings/* displays Access Denied
    await page.goto('/admin/settings/departments');
    await expect(page.locator('text=Access Denied')).toBeVisible();

    await page.goto('/admin/settings/roles');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('8. Mobile 360px viewport run and screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await loginAsAdmin(page);

    // Add Employee at 360px
    await page.goto('/admin/employees/new');
    await expect(page.locator('h1')).toContainText('Add Employee');
    await page.screenshot({ path: path.join(screenshotDir, 'add_employee_360px.png') });

    const mobileEmail = `mobile_${Date.now()}@vernoxy.com`;
    await page.fill('#employee-name-input', 'Mobile Single User');
    await page.fill('#employee-email-input', mobileEmail);
    await page.locator('#employee-dep-select').selectOption({ label: 'Admin' });
    await expect(page.locator('#employee-role-select')).toBeEnabled();
    // Role is optional: submit without selecting a role
    await page.click('#employee-generate-password-btn');

    await page.click('#employee-form-submit-btn');
    await expect(page.locator('#handover-credentials-panel')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'handover_panel_360px.png') });

    await page.click('#handover-view-employees-btn');
    await expect(page).toHaveURL(/\/admin\/employees/);
    await page.screenshot({ path: path.join(screenshotDir, 'employees_list_360px.png') });

    // Settings at 360px
    await page.goto('/admin/settings/departments');
    await page.screenshot({ path: path.join(screenshotDir, 'settings_departments_360px.png') });

    await page.goto('/admin/settings/roles');
    await page.screenshot({ path: path.join(screenshotDir, 'settings_roles_360px.png') });
  });

  test('9. Axe accessibility audit on Add Employee and Settings pages', async ({ page }) => {
    await loginAsAdmin(page);

    // Check Add Employee page
    await page.goto('/admin/employees/new');
    await expect(page.locator('h1')).toContainText('Add Employee');

    const employeeScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    console.log(`[AXE] Add Employee page violations: ${employeeScan.violations.length}`);
    if (employeeScan.violations.length > 0) {
      console.log(JSON.stringify(employeeScan.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })), null, 2));
    }
    expect(employeeScan.violations.length).toBe(0);

    // Check Settings Departments page
    await page.goto('/admin/settings/departments');
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.locator('h2', { hasText: 'Departments' })).toBeVisible();

    const deptScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    console.log(`[AXE] Settings Departments page violations: ${deptScan.violations.length}`);
    if (deptScan.violations.length > 0) {
      console.log(JSON.stringify(deptScan.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })), null, 2));
    }
    expect(deptScan.violations.length).toBe(0);

    // Check Settings Roles page
    await page.goto('/admin/settings/roles');
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.locator('h2', { hasText: 'Roles' })).toBeVisible();

    const rolesScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    console.log(`[AXE] Settings Roles page violations: ${rolesScan.violations.length}`);
    if (rolesScan.violations.length > 0) {
      console.log(JSON.stringify(rolesScan.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })), null, 2));
    }
    expect(rolesScan.violations.length).toBe(0);
  });
});
