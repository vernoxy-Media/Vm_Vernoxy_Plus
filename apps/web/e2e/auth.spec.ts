import { test, expect } from '@playwright/test';
import { setupPlaywrightUser } from '../../../scripts/setup-playwright-user';

const TEST_EMAIL = 'playwright_test@vernoxy.com';
let currentPassword = 'PlaywrightP@ssw0rd123!';

async function clearMailpit() {
  try {
    await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to clear mailpit:', err);
  }
}

async function getLatestMailpitOtp(email: string, maxRetries = 15): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:8025/api/v1/messages');
      if (res.ok) {
        const data = await res.json();
        const msg = (data.messages || []).find((m: any) =>
          (m.To || []).some((to: any) => to.Address.toLowerCase() === email.toLowerCase())
        );
        if (msg) {
          const content = `${msg.Snippet || ''} ${msg.Text || ''}`;
          const match = content.match(/\b\d{6}\b/);
          if (match) return match[0];
        }
      }
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for OTP email in Mailpit for ${email}`);
}

test.describe('Vernoxy Pulse Auth Flow (E2E)', () => {
  test.beforeEach(async () => {
    await clearMailpit();
    await setupPlaywrightUser(currentPassword);
  });

  // 1. Happy-path login
  test('1. happy-path login (password -> OTP from Mailpit -> home overview)', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', currentPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\/verify/);
    await expect(page.locator('#otp-code-input')).toBeVisible();

    const otpCode = await getLatestMailpitOtp(TEST_EMAIL);
    expect(otpCode).toMatch(/^\d{6}$/);

    await page.fill('#otp-code-input', otpCode);
    await page.click('#verify-submit-button');

    await expect(page).toHaveURL('/');
    await expect(page.locator('#user-display-name')).toHaveText('Playwright Tester');
    await expect(page.locator('#user-display-email')).toHaveText(TEST_EMAIL);
    await expect(page.locator('#logout-button')).toBeVisible();
  });

  // 2. Wrong password message
  test('2. wrong password message displays generic failure', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    const alert = page.locator('#login-error-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/Invalid email or password/i);
  });

  // 3. Wrong code message
  test('3. wrong code message shows generic error alert', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', currentPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\/verify/);

    await page.fill('#otp-code-input', '000000');
    await page.click('#verify-submit-button');

    const alert = page.locator('#verify-error-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/Invalid or expired code/i);
  });

  // 4. Resend countdown
  test('4. resend button shows countdown on verify page', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', currentPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\/verify/);

    const resendBtn = page.locator('#resend-otp-button');
    await expect(resendBtn).toBeVisible();
    await expect(resendBtn).toBeDisabled();
    await expect(resendBtn).toHaveText(/Resend code in \d+s/);
  });

  // 5. forgot -> reset -> login with the new password
  test('5. forgot -> reset -> login with the new password', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('#forgot-email', TEST_EMAIL);
    await page.click('button[type="submit"]');

    await expect(page.locator('#proceed-to-reset-button')).toBeVisible();

    const resetOtp = await getLatestMailpitOtp(TEST_EMAIL);
    expect(resetOtp).toMatch(/^\d{6}$/);

    await page.click('#proceed-to-reset-button');
    await expect(page).toHaveURL(/\/reset-password/);

    const brandNewPassword = 'BrandNewP@ssw0rd2026!';
    await page.fill('#reset-email', TEST_EMAIL);
    await page.fill('#reset-code', resetOtp);
    await page.fill('#new-password', brandNewPassword);
    await page.fill('#confirm-password', brandNewPassword);
    await page.click('#reset-submit-button');

    await expect(page.locator('#back-to-login-after-reset-button')).toBeVisible();
    await page.click('#back-to-login-after-reset-button');
    await expect(page).toHaveURL(/\/login/);

    // Update password for test suite
    currentPassword = brandNewPassword;

    // Login with new password
    await clearMailpit();
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', brandNewPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\/verify/);

    const newLoginOtp = await getLatestMailpitOtp(TEST_EMAIL);
    await page.fill('#otp-code-input', newLoginOtp);
    await page.click('#verify-submit-button');

    await expect(page).toHaveURL('/');
    await expect(page.locator('#user-display-name')).toHaveText('Playwright Tester');
  });

  // 6. Refresh the browser page and stay signed in
  test('6. refresh the browser page and stay signed in', async ({ page }) => {
    // Already on '/' from previous test or login
    if (page.url() !== 'http://localhost:5199/') {
      await page.goto('/login');
      await page.fill('#email', TEST_EMAIL);
      await page.fill('#password', currentPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/login\/verify/);
      const code = await getLatestMailpitOtp(TEST_EMAIL);
      await page.fill('#otp-code-input', code);
      await page.click('#verify-submit-button');
      await expect(page).toHaveURL('/');
    }

    // Refresh page
    await page.reload();

    await expect(page).toHaveURL('/');
    await expect(page.locator('#user-display-name')).toHaveText('Playwright Tester');
  });

  // 7. Logout in one tab logs out the second tab (BroadcastChannel)
  test('7. logout in one tab logs out the second tab', async ({ context }) => {
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();

    // Login on Tab 1
    await tab1.goto('/login');
    await tab1.fill('#email', TEST_EMAIL);
    await tab1.fill('#password', currentPassword);
    await tab1.click('button[type="submit"]');
    await expect(tab1).toHaveURL(/\/login\/verify/);
    const code = await getLatestMailpitOtp(TEST_EMAIL);
    await tab1.fill('#otp-code-input', code);
    await tab1.click('#verify-submit-button');
    await expect(tab1).toHaveURL('/');

    // Navigate Tab 2 to '/'
    await tab2.goto('/');
    await expect(tab2.locator('#user-display-name')).toHaveText('Playwright Tester');

    // On Tab 1, click Logout
    await tab1.click('#logout-button');
    await expect(tab1).toHaveURL(/\/login/);

    // Tab 2 automatically logs out and redirects to /login via BroadcastChannel
    await expect(tab2).toHaveURL(/\/login/);
  });

  // 8. Mobile viewport 360px passes the same login flow
  test('8. mobile viewport 360px passes the same login flow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });

    await page.goto('/login');
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', currentPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\/verify/);

    const code = await getLatestMailpitOtp(TEST_EMAIL);
    await page.fill('#otp-code-input', code);
    await page.click('#verify-submit-button');

    await expect(page).toHaveURL('/');
    await expect(page.locator('#user-display-name')).toHaveText('Playwright Tester');
  });
});
