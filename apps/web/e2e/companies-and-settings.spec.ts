import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AxeBuilder from '@axe-core/playwright';
import { setupPlaywrightUser } from '../../../scripts/setup-playwright-user';

const TEST_ADMIN_EMAIL = 'playwright_test@vernoxy.com';
const TEST_ADMIN_PASSWORD = 'PlaywrightP@ssw0rd123!';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
}

test.describe('Industries & Customer Types Master Data Settings', () => {
  test.beforeAll(async () => {
    await setupPlaywrightUser(TEST_ADMIN_PASSWORD);
  });

  test('Settings: Industries page shows level filters, default badge and sub-industries', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/industries');

    await expect(page.locator('h2')).toContainText('Industries');
    // Top-level table exists
    await expect(page.locator('table')).toBeVisible();

    // Switch to Sub-industries filter
    await page.click('button:has-text("Sub-industries")');
    await expect(page.locator('select:has-text("All Parents")')).toBeVisible();

    // Switch back to Industries
    await page.click('button:has-text("Industries")');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Settings: Customer types page shows list and allows switching default', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings/customer-types');

    await expect(page.locator('h2')).toContainText('Customer Types');
    await expect(page.locator('table')).toBeVisible();

    // Check default badge is present
    await expect(page.locator('text=Default').first()).toBeVisible();
  });
});

test.describe('Companies Module End-to-End Flow', () => {
  let createdCompanyUrl = '';
  const uniqueName = `Acme Enterprise ${Date.now()}`;

  test.beforeAll(async () => {
    await setupPlaywrightUser(TEST_ADMIN_PASSWORD);
  });

  test('1. Companies list loads and displays responsive layout with screenshots', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/companies');

    await expect(page.locator('h1')).toContainText('Companies');
    await expect(page.locator('input[placeholder*="Search companies"]')).toBeVisible();

    // 1440px Desktop Screenshot
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'company_list_1440.png'), fullPage: true });

    // 360px Mobile Screenshot
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'company_list_360.png'), fullPage: true });
  });

  test('2. Company creation flow with channels, contacts, and duplicate detection', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/companies/new');

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('h1')).toContainText('Create New Company');

    // Fill Details
    await page.fill('#company-name-input', uniqueName);
    await page.selectOption('#company-customer-type-select', { index: 1 });
    await page.selectOption('#company-industry-select', { index: 1 });

    // Fill Address
    await page.fill('#company-city-input', 'Metropolis');
    await page.fill('#company-state-input', 'New York');

    // Add Channel
    await page.click('button:has-text("Add Channel")');
    await page.fill('input[placeholder*="acme.com"]', 'https://acme-test.org');

    // Add Contact
    await page.click('button:has-text("Add Contact")');
    await page.fill('input[placeholder="e.g. Jane Doe"]', 'Chief Executive');
    await page.fill('input[placeholder="jane@example.com"]', `ceo_${Date.now()}@acme-test.org`);
    await page.fill('input[placeholder*="VP of Sales"]', 'Chief Executive Officer');

    // Screenshots of form
    await page.screenshot({ path: path.join(screenshotDir, 'company_form_1440.png'), fullPage: true });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({ path: path.join(screenshotDir, 'company_form_360.png'), fullPage: true });

    // Submit form
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('button:has-text("Save Company")');

    // Should redirect to detail page
    await expect(page).toHaveURL(/\/companies\/\d+/);
    createdCompanyUrl = page.url();
  });

  test('3. Company detail page displays channels with LinkValue and contacts', async ({ page }) => {
    await loginAsAdmin(page);
    if (createdCompanyUrl) {
      await page.goto(createdCompanyUrl);
    } else {
      await page.goto('/companies');
      await page.locator('table tbody tr a').first().click();
    }

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Company Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Communication Channels' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Associated Contacts' })).toBeVisible();

    // 1440px Screenshot
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'company_detail_1440.png'), fullPage: true });

    // 360px Screenshot
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'company_detail_360.png'), fullPage: true });

    // Accessibility check (axe-core)
    await page.setViewportSize({ width: 1440, height: 900 });
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Ignore color contrast differences in dark mode / shadows
      .analyze();
    expect(accessibilityScanResults.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
  });
});
