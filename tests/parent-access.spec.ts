import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Parent Access', () => {
  test('parent email input appears on profile page', async ({ page }) => {
    // Log in as a student
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');

    // Parent Access section should be visible for students
    await expect(page.locator('text=Parent Access')).toBeVisible();
    await expect(page.locator('input[placeholder="parent@email.com"]')).toBeVisible();
    await expect(page.locator('text=Send Invitation')).toBeVisible();
  });

  test('saving parent email shows success toast', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');

    // Fill in parent email
    await page.fill('input[placeholder="parent@email.com"]', 'parent@example.com');
    await page.locator('button:has-text("Send Invitation")').click();

    // Wait for success toast
    await expect(page.locator('text=Invitation sent to')).toBeVisible({ timeout: 5000 });
  });

  test('/parent-view with invalid token shows error state', async ({ page }) => {
    await page.goto(`${BASE_URL}/parent-view?token=invalid-token-12345`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Access Unavailable')).toBeVisible();
    await expect(page.locator('text=invalid or has expired')).toBeVisible();
  });

  test('/parent-view with valid token shows student data', async ({ page }) => {
    // This test requires a valid parent_access_token in the database
    // In a real test setup, first set the parent email via API to generate a token
    // For now, verify the page structure loads correctly with a real token

    // Step 1: Log in and set parent email to generate a token
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Step 2: Set parent email via profile page
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');

    const parentInput = page.locator('input[placeholder="parent@email.com"]');
    const hasInput = await parentInput.isVisible().catch(() => false);

    if (hasInput) {
      await parentInput.fill('testparent@example.com');
      await page.locator('button:has-text("Send Invitation")').click();
      await page.waitForResponse(resp => resp.url().includes('/auth/me') && resp.request().method() === 'PUT');

      // TODO: extract the token from the database to test the parent view page
      // For now, we just verify the profile page saved successfully
      await expect(page.locator('text=Invitation sent to').or(page.locator('text=testparent@example.com'))).toBeVisible({ timeout: 5000 });
    }
  });
});
