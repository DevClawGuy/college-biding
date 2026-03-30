import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Guides & Checklists', () => {
  test('/guides page loads without login', async ({ page }) => {
    await page.goto(`${BASE_URL}/guides`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Student Housing Guides & Checklists')).toBeVisible();
    await expect(page.locator('text=Everything you need to find')).toBeVisible();
  });

  test('all 6 guide cards are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/guides`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Move-In Essentials Checklist')).toBeVisible();
    await expect(page.locator('text=Lease Red Flags to Watch For')).toBeVisible();
    await expect(page.locator('text=Roommate Agreement Template')).toBeVisible();
    await expect(page.locator('text=Rental Scam Warning Signs')).toBeVisible();
    await expect(page.locator('text=How to Inspect an Apartment')).toBeVisible();
    await expect(page.locator('text=What Happens After You Win a HouseRush Auction')).toBeVisible();

    // All 6 download buttons
    const downloadButtons = page.locator('button:has-text("Download Checklist")');
    await expect(downloadButtons).toHaveCount(6);
  });

  test('Download button triggers file download', async ({ page }) => {
    await page.goto(`${BASE_URL}/guides`);
    await page.waitForLoadState('networkidle');

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Download Checklist")').first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^houserush-.*\.txt$/);
  });

  test('Browse Listings CTA links to /listings', async ({ page }) => {
    await page.goto(`${BASE_URL}/guides`);
    await page.waitForLoadState('networkidle');

    const cta = page.locator('a:has-text("Browse Listings")').last();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/listings');
  });
});
