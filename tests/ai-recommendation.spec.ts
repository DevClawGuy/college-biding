import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('AI Bid Recommendation', () => {
  test('button appears for logged-in students on active listing', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Get AI Bid Recommendation')).toBeVisible();
  });

  test('button hidden for landlords', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'sarah.chen@realty.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Get AI Bid Recommendation')).not.toBeVisible();
  });

  test('button hidden for logged-out users', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Get AI Bid Recommendation')).not.toBeVisible();
  });

  test('click shows loading state', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await page.locator('text=Get AI Bid Recommendation').click();
    await expect(page.locator('text=Analyzing auction data...')).toBeVisible({ timeout: 3000 });
  });

  test('after loading, recommendation card appears with min/mid/max range', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await page.locator('text=Get AI Bid Recommendation').click();
    await expect(page.locator('text=AI Bid Recommendation')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Recommended range')).toBeVisible();
    await expect(page.locator('text=At minimum')).toBeVisible();
    await expect(page.locator('text=At recommended')).toBeVisible();
  });

  test('bid input populated with recommendedMid after load', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await page.locator('text=Get AI Bid Recommendation').click();
    await expect(page.locator('text=AI Bid Recommendation')).toBeVisible({ timeout: 10000 });

    // Open bid modal — input should be pre-filled
    await page.locator('button:has-text("Place a Bid")').click();
    const bidInput = page.locator('input[type="number"]').first();
    const value = await bidInput.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });

  test('refresh button re-triggers fetch', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await page.locator('text=Get AI Bid Recommendation').click();
    await expect(page.locator('text=AI Bid Recommendation')).toBeVisible({ timeout: 10000 });

    // Click refresh
    const refreshPromise = page.waitForResponse(resp =>
      resp.url().includes('/ai/bid-recommendation/') && resp.request().method() === 'POST'
    );
    await page.locator('text=Refresh').click();
    const response = await refreshPromise;
    expect(response.status()).toBe(200);
  });
});
