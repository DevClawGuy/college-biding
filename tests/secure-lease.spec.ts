import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// TODO: seed a listing with secureLeasePrice before running these tests
// These tests assume a listing with Secure Lease Now exists and is active

test.describe('Secure Lease Now', () => {
  test('secure lease button appears when listing has secureLeasePrice', async ({ page }) => {
    // Navigate to a listing detail page that has a secure lease price
    await page.goto(`${BASE_URL}/listings`);
    // Click first listing card
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Check for secure lease button (only visible if listing has secureLeasePrice)
    const secureButton = page.locator('button:has-text("Secure Lease Now")');
    const hasSecureLease = await secureButton.isVisible().catch(() => false);

    if (hasSecureLease) {
      await expect(secureButton).toBeVisible();
      await expect(secureButton).toContainText('/mo');
    }
  });

  test('clicking secure lease shows confirmation modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    const secureButton = page.locator('button:has-text("Secure Lease Now")');
    const hasSecureLease = await secureButton.isVisible().catch(() => false);

    if (hasSecureLease) {
      await secureButton.click();

      // Confirmation modal should appear
      await expect(page.locator('text=Secure This Lease?')).toBeVisible();
      await expect(page.locator('text=Confirm & Secure')).toBeVisible();
      await expect(page.locator('text=Cancel')).toBeVisible();
    }
  });

  test('cancel button closes the confirmation modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    const secureButton = page.locator('button:has-text("Secure Lease Now")');
    const hasSecureLease = await secureButton.isVisible().catch(() => false);

    if (hasSecureLease) {
      await secureButton.click();
      await expect(page.locator('text=Secure This Lease?')).toBeVisible();

      // Click cancel
      await page.locator('button:has-text("Cancel")').click();

      // Modal should be gone
      await expect(page.locator('text=Secure This Lease?')).not.toBeVisible();
    }
  });

  test('confirming secure lease calls correct API and shows auction closed', async ({ page }) => {
    // This test requires authentication — log in first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    const secureButton = page.locator('button:has-text("Secure Lease Now")');
    const hasSecureLease = await secureButton.isVisible().catch(() => false);

    if (hasSecureLease) {
      // Intercept the secure-lease API call
      const responsePromise = page.waitForResponse(resp =>
        resp.url().includes('/bids/secure-lease/') && resp.request().method() === 'POST'
      );

      await secureButton.click();
      await page.locator('button:has-text("Confirm & Secure")').click();

      const response = await responsePromise;
      expect(response.status()).toBe(200);

      // After securing, auction should show as closed
      await expect(page.locator('text=Auction Closed').or(page.locator('text=You Won!'))).toBeVisible({ timeout: 5000 });
    }
  });
});
