import { expect, test } from '@playwright/test';

test('collection selection, range, keyboard focus and nested controls share one owner', async ({ page }) => {
  await page.goto('/?collection');
  const alpha = page.getByRole('option', { name: 'Alpha' });
  const beta = page.getByRole('option', { name: 'Beta' });
  const gamma = page.getByRole('option', { name: 'Gamma' });
  await alpha.click();
  await expect(alpha).toHaveAttribute('aria-selected', 'true');
  await gamma.click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('collection-selected')).toHaveText('Alpha|Beta|Gamma');
  await expect(page.getByTestId('collection-count')).toHaveText('3');

  await page.getByRole('button', { name: 'Clear selection' }).click();
  await alpha.focus();
  await alpha.press('ArrowDown');
  await expect(beta).toBeFocused();
  await beta.press('Space');
  await expect(beta).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Clear selection' }).click();
  await page.getByRole('button', { name: 'Nested action' }).click();
  await expect(page.getByTestId('collection-nested-actions')).toHaveText('1');
  await expect(page.getByTestId('collection-count')).toHaveText('0');
});

test('collection scope resets selection and retained records resolve current previews', async ({ page }) => {
  await page.goto('/?collection');
  const alpha = page.getByRole('option', { name: 'Alpha' });
  await alpha.click();
  await page.getByRole('button', { name: 'Switch owner' }).click();
  await expect(page.getByTestId('collection-count')).toHaveText('0');

  await alpha.click();
  await page.getByRole('button', { name: 'Remove Alpha' }).click();
  await expect(page.getByTestId('collection-selected')).toHaveText('Alpha');
  await page.getByRole('button', { name: 'Refresh Alpha' }).click();
  await expect(page.getByTestId('collection-selected')).toHaveText('Alpha refreshed');
  await page.getByRole('button', { name: 'Forget Alpha' }).click();
  await expect(page.getByTestId('collection-count')).toHaveText('0');
});

test('first plain click selects and plain click toggles an active selection', async ({ page }) => {
  await page.goto('/?collection');
  const alpha = page.getByRole('option', { name: 'Alpha' });
  await alpha.click();
  await expect(alpha).toHaveAttribute('aria-selected', 'true');
  await alpha.click();
  await expect(alpha).toHaveAttribute('aria-selected', 'false');

  await alpha.click();
  const beta = page.getByRole('option', { name: 'Beta' });
  await beta.click({ modifiers: ['Control'] });
  await expect(alpha).toHaveAttribute('aria-selected', 'true');
  await expect(beta).toHaveAttribute('aria-selected', 'true');
});

test('nested collections with overlapping IDs select and reset independently', async ({ page }) => {
  await page.goto('/?collection');
  const scope = page.getByRole('region', { name: 'Nested collection isolation' });
  await scope.getByText('Outer selection surface', { exact: true }).click();
  await expect(scope.getByTestId('nested-outer-selected')).toHaveText('a');
  const innerAlpha = scope.getByRole('option', { name: 'Inner first', exact: true });
  await innerAlpha.click();
  await expect(scope.getByTestId('nested-inner-selected')).toHaveText('a');
  await expect(scope.getByTestId('nested-outer-selected')).toHaveText('a');
  await innerAlpha.press('ControlOrMeta+a');
  await expect(scope.getByTestId('nested-inner-selected')).toHaveText('a|b');
  await expect(scope.getByTestId('nested-outer-selected')).toHaveText('a');
  await scope.getByRole('button', { name: 'Reset inner collection owner' }).click();
  await expect(scope.getByTestId('nested-inner-selected')).toBeEmpty();
  await expect(scope.getByTestId('nested-outer-selected')).toHaveText('a');
});
