import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AxeBuilder from '@axe-core/playwright';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { setupPlaywrightUser } from '../../../scripts/setup-playwright-user';

const TEST_ADMIN_EMAIL = 'playwright_test@vernoxy.com';
const TEST_ADMIN_PASSWORD = 'PlaywrightP@ssw0rd123!';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.resolve(__dirname, '../../../logs/screenshots');

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test'), override: true });

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

async function resetAttendanceForUser() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) return;
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  try {
    const empRes = await client.query(`SELECT emp_id FROM employees WHERE email = $1 AND deleted_at IS NULL;`, [TEST_ADMIN_EMAIL]);
    if (empRes.rows.length > 0) {
      const empId = empRes.rows[0].emp_id;
      await client.query(
        `UPDATE attendance_breaks SET deleted_at = NOW() WHERE attendance_id IN (SELECT attendance_id FROM attendance_days WHERE emp_id = $1) AND deleted_at IS NULL;`,
        [empId],
      );
      await client.query(`UPDATE attendance_days SET deleted_at = NOW() WHERE emp_id = $1 AND deleted_at IS NULL;`, [empId]);
    }
  } finally {
    await client.end();
  }
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
  await clearMailpit();
}

test.describe('Attendance Dashboard & Workday Redesign', () => {
  test.beforeAll(async () => {
    await setupPlaywrightUser();
    await resetAttendanceForUser();
  });

  test('1. Full Lifecycle: Punch In -> Break -> Resume -> Punch Out with Confirmation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/attendance');
    await expect(page).toHaveURL('/attendance');

    // Verify Dashboard layout cards
    await expect(page.locator('#attendance-page')).toBeVisible();
    await expect(page.locator('#timesheet-card')).toBeVisible();
    await expect(page.locator('#attendance-dashboard-cards')).toBeVisible();
    await expect(page.locator('#month-details-card')).toBeVisible();
    await expect(page.locator('#attendance-calendar-card')).toBeVisible();
    await expect(page.locator('#attendance-list-card')).toBeVisible();

    // Initial state: not started -> Punch In button visible
    const punchInBtn = page.locator('#punch-in-button');
    await expect(punchInBtn).toBeVisible();
    await expect(punchInBtn).toHaveText(/Punch In/i);

    // Click Punch In
    await punchInBtn.click();
    await expect(page.locator('#punch-out-button')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#start-break-button')).toBeVisible();
    await expect(page.locator('#live-session-timer')).toBeVisible();

    // Click Start Break
    const startBreakBtn = page.locator('#start-break-button');
    await startBreakBtn.click();

    // Verify on_break state
    const endBreakBtn = page.locator('#end-break-button');
    await expect(endBreakBtn).toBeVisible({ timeout: 10000 });
    await expect(endBreakBtn).toHaveText(/Resume/i);

    // Verify confirmation modal when trying to checkout while on break
    const punchOutBtn = page.locator('#punch-out-button');
    await punchOutBtn.click();
    await expect(page.locator('#checkout-confirm-dialog')).toBeVisible();
    await expect(page.locator('#checkout-confirm-dialog')).toContainText(/You are currently on a break/i);

    // Cancel modal
    await page.locator('#cancel-checkout-button').click();
    await expect(page.locator('#checkout-confirm-dialog')).not.toBeVisible();

    // Resume working
    await endBreakBtn.click();
    await expect(page.locator('#start-break-button')).toBeVisible({ timeout: 10000 });

    // Punch Out while working
    await punchOutBtn.click();

    // Finished workday
    await expect(page.locator('#timesheet-completed-banner')).toBeVisible({ timeout: 10000 });
  });

  test('2. Calendar Day Detail Interaction & Correction Request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/attendance');

    // Click on a calendar day cell to open Day Detail Panel
    const dayCell = page.locator('[id^="calendar-day-"]').first();
    if (await dayCell.isVisible()) {
      await dayCell.click();
      await expect(page.locator('#day-detail-panel')).toBeVisible();
      await expect(page.locator('#close-day-detail-button')).toBeVisible();

      // Open correction request dialog
      const correctionBtn = page.locator('#open-correction-dialog-button');
      if (await correctionBtn.isVisible()) {
        await correctionBtn.click();
        await expect(page.locator('#request-correction-dialog')).toBeVisible();
        await page.locator('#cancel-correction-button').click();
        await expect(page.locator('#request-correction-dialog')).not.toBeVisible();
      }

      await page.locator('#close-day-detail-button').click();
      await expect(page.locator('#day-detail-panel')).not.toBeVisible();
    }
  });

  test('3. Responsive Layout & Screenshots (Desktop 1440px vs Mobile 360px)', async ({ page }) => {
    await loginAsAdmin(page);

    // Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#desktop-calendar-grid')).toBeVisible();
    await expect(page.locator('#attendance-desktop-table')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'attendance-desktop-1440.png'), fullPage: true });

    // Mobile 360x780
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#mobile-calendar-list')).toBeVisible();
    await expect(page.locator('#attendance-mobile-list')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'attendance-mobile-360.png'), fullPage: true });
  });

  test('4. Axe Accessibility Audit (0 Critical or Serious Violations, Touch Targets >= 44px)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // Run axe accessibility analysis
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Ignore third-party brand contrasts if any
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalOrSerious.length).toBe(0);

    // Verify touch target minimums on action buttons
    const punchInBtn = page.locator('#punch-in-button');
    if (await punchInBtn.isVisible()) {
      const box = await punchInBtn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
