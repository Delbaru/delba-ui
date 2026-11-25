import { expect, test } from '@playwright/test';

test('ui.collapse owns one state controller and exposes trigger and imperative commands', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: 'UI collapse door' });
  const trigger = region.getByTestId('ui-collapse-trigger');
  const content = region.getByTestId('ui-collapse-surface');
  await expect(region.getByTestId('ui-collapse-state')).toHaveText('false');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(content).not.toBeVisible();

  await trigger.click();
  await expect(region.getByTestId('ui-collapse-state')).toHaveText('true');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(content).toBeVisible();

  await region.getByTestId('ui-collapse-hide').click();
  await expect(region.getByTestId('ui-collapse-state')).toHaveText('false');
  await expect(content).not.toBeVisible();

  await region.getByTestId('ui-collapse-show').click();
  await expect(region.getByTestId('ui-collapse-state')).toHaveText('true');
  await expect(content).toBeVisible();
});
