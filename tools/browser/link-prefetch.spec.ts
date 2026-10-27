import { expect, test } from '@playwright/test';

test('intent gate follows hover, keyboard focus and href; disabled and anchors stay off', async ({ page }) => {
  await page.goto('/?link-prefetch');
  const state = page.getByTestId('prepared');
  await expect(state).toHaveText('false');
  await page.getByRole('link', { name: 'Target', exact: true }).hover();
  await expect(state).toHaveText('true');
  await page.getByRole('button', { name: 'Change address', exact: true }).click();
  await expect(state).toHaveText('false');
  await page.getByRole('link', { name: 'Target', exact: true }).focus();
  await expect(state).toHaveText('true');
  await page.getByRole('button', { name: 'Disable', exact: true }).click();
  await page.getByRole('link', { name: 'Target', exact: true }).hover();
  await expect(state).toHaveText('false');
  await page.getByRole('button', { name: 'Disable', exact: true }).click();
  await page.getByRole('button', { name: 'Automatic full', exact: true }).click();
  await expect(state).toHaveText('true');
  await page.getByRole('button', { name: 'Anchor', exact: true }).click();
  await page.getByRole('link', { name: 'Target', exact: true }).focus();
  await expect(state).toHaveText('false');
  await page.getByRole('button', { name: 'Change address', exact: true }).click();
  await page.getByRole('button', { name: 'Off', exact: true }).click();
  await page.getByRole('link', { name: 'Target', exact: true }).hover();
  await expect(state).toHaveText('false');
});
