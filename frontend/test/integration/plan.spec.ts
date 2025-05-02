import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.setTimeout(120000); // Increase global timeout to 60 seconds

test.describe('basic app functionality', () => {
  test('should display the plan section', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', {name: /Plan Your Route/}).click();

    expect(page.locator('#drone-number')).toBeVisible();
    expect(page.locator('#algorithm-select')).toBeVisible();
    expect(page.locator('#algorithm-select')).toBeVisible();
    expect(page.locator('#latitude-input')).toBeVisible();
    expect(page.locator('#longitude-input')).toBeVisible();
    expect(page.locator('#zoom-input')).toBeVisible();

    await expect(page).toHaveScreenshot();
  });

  test('should display the discover section', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('link', {name: /Discover/}).click();

      expect(await page.getByRole('button', { name: 'No-Fly Zones ▼' })).toBeVisible();
      await page.getByRole('button', { name: 'No-Fly Zones ▼' }).click();
      expect(page.getByText('Iowa No-Fly Zones')).toBeVisible();
      expect(page.getByRole('button', { name: 'Refresh Map' })).toBeVisible();

      await expect(page).toHaveScreenshot();
  });

  test('should display the create targets section', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('link', {name: /Create Targets/}).click();
        await page.getByRole('button', {name: 'Load Example'}).click();

        await expect(page).toHaveScreenshot();
    });
});
