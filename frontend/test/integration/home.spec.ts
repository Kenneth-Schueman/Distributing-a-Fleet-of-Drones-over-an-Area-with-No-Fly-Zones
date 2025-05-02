import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the hero section', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Smart Drone Fleet Router');
    await expect(page.locator('.hero-description')).toHaveText(/Optimize your drone fleet routes/i);
  });

  test('should have a CTA button', async ({ page }) => {
    const ctaButton = page.locator('.cta-button');
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveText('Plan Your Route');
  });

  test('should navigate to the plan page when clicking CTA button', async ({ page }) => {
    await page.click('.cta-button');
    await expect(page).toHaveURL('/plan');
  });

  test('should display feature cards', async ({ page }) => {
    await expect(page.locator('.feature-card')).toHaveCount(3);
    await expect(page.locator('.feature-title')).toContainText([
      'Smart Area Partitioning',
      'FAA Compliance',
      'Dynamic Path Planning',
    ]);
  });
});
