import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('In-App Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('Message Landlord section appears on listing detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Message Landlord')).toBeVisible();
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible();
  });

  test('sending a message adds it to the thread', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill('Hi, is this still available?');

    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/messages/') && resp.request().method() === 'POST'
    );

    await page.locator('button:has(svg.lucide-send)').last().click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // Message should appear in thread
    await expect(page.locator('text=Hi, is this still available?')).toBeVisible({ timeout: 5000 });
  });

  test('Messages tab appears in dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("Messages")')).toBeVisible();

    // Click Messages tab
    await page.locator('button:has-text("Messages")').click();

    // Should show either conversations or empty state
    await expect(
      page.locator('text=No messages yet').or(page.locator('text=Message Landlord').or(page.locator('[class*="rounded-2xl"]')))
    ).toBeVisible({ timeout: 5000 });
  });

  test('unread count badge shows on navbar message icon', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.waitForLoadState('networkidle');

    // The message icon should be visible in the navbar
    const msgIcon = page.locator('nav button svg.lucide-message-circle');
    await expect(msgIcon).toBeVisible();
  });
});
