import { expect, test } from '@playwright/test';

test('ui.async owns loading, current-data, empty, error and retry phases', async ({ page }) => {
  await page.goto('/?async');
  const surface = page.getByTestId('async-surface');
  await expect(surface.getByTestId('async-loading')).toBeVisible();

  await page.getByRole('button', { name: 'Resolve source' }).click();
  await expect(surface.getByTestId('async-value')).toHaveText('current');

  await page.getByRole('button', { name: 'Network error' }).click();
  await expect(surface.getByRole('alert')).toContainText('Offline');
  await expect(surface.getByTestId('async-value')).toHaveText('current');

  await surface.getByRole('button', { name: 'Retry source' }).click();
  await expect(page.getByTestId('async-retries')).toHaveText('1');

  await page.getByRole('button', { name: 'Server error' }).click();
  await expect(surface.getByRole('alert')).toContainText('Server error');
  await expect(surface.getByTestId('async-value')).toHaveCount(0);

  await page.getByRole('button', { name: 'Empty source' }).click();
  await expect(surface.getByTestId('async-empty')).toBeVisible();
});
