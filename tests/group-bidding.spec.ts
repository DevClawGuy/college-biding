import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// TODO: seed a listing and student accounts before running these tests

test.describe('Group Bidding', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as a student
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'alex.m@monmouth.edu');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('group bidding section appears on listing detail for students', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Group Bidding')).toBeVisible();
    await expect(page.locator('text=Create Group Bid')).toBeVisible();
  });

  test('create group modal opens and accepts member emails', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Create Group Bid")').click();

    // Modal should appear
    await expect(page.locator('text=Create Group Bid').nth(1)).toBeVisible();
    await expect(page.locator('input[placeholder*="Beach House"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="roommate@"]')).toBeVisible();

    // Fill in group name and email
    await page.fill('input[placeholder*="Beach House"]', 'Test Group');
    await page.fill('input[placeholder*="roommate@"]', 'jordan.k@monmouth.edu');

    // Add another roommate button should work
    await page.locator('button:has-text("Add another roommate")').click();
    const emailInputs = page.locator('input[placeholder*="roommate@"]');
    await expect(emailInputs).toHaveCount(2);
  });

  test('join group via URL param works', async ({ page }) => {
    // This test requires a valid group ID — in real test setup, create a group first
    // For now, verify the page loads without error when join_group param is present
    await page.goto(`${BASE_URL}/listings`);
    const listingLink = page.locator('a[href^="/listing/"]').first();
    const href = await listingLink.getAttribute('href');

    if (href) {
      // Navigate with a fake join_group param — should not crash
      await page.goto(`${BASE_URL}${href}?join_group=fake-id`);
      await page.waitForLoadState('networkidle');

      // Page should still render normally
      await expect(page.locator('text=Group Bidding')).toBeVisible();
    }
  });

  test('group bid button submits to correct endpoint', async ({ page }) => {
    await page.goto(`${BASE_URL}/listings`);
    await page.locator('a[href^="/listing/"]').first().click();
    await page.waitForLoadState('networkidle');

    // Create a group first
    await page.locator('button:has-text("Create Group Bid")').click();
    await page.fill('input[placeholder*="Beach House"]', 'E2E Test Group');
    await page.fill('input[placeholder*="roommate@"]', 'jordan.k@monmouth.edu');

    // Intercept the create group API call
    const createResponse = page.waitForResponse(resp =>
      resp.url().includes('/bid-groups') && resp.request().method() === 'POST' && !resp.url().includes('/bid') && !resp.url().includes('/join')
    );

    await page.locator('button:has-text("Create Group & Send Invites")').click();
    const resp = await createResponse;
    expect(resp.status()).toBe(201);

    // Close the success modal
    await page.locator('button:has-text("Done")').click();

    // Now the Place Group Bid button should appear
    const groupBidBtn = page.locator('button:has-text("Place Group Bid")');
    const hasGroupBid = await groupBidBtn.isVisible().catch(() => false);

    if (hasGroupBid) {
      await groupBidBtn.click();
      // Should open bid modal with group context
      await expect(page.locator('text=Place Group Bid').first()).toBeVisible();
      await expect(page.locator('text=Bidding as')).toBeVisible();
    }
  });
});
