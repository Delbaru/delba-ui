import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?grid-layout');
});

test('only new items fade, entry cascades, survivor keeps its DOM and input', async ({ page }) => {
  const survivor = page.getByTestId('item-a');
  const handle = await survivor.elementHandle();
  await page.getByRole('textbox', { name: 'Value a', exact: true }).fill('kept');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  expect(await survivor.evaluate((node, original) => node === original, handle)).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Value a', exact: true })).toHaveValue('kept');
  const motion = await page.getByTestId('layout-grid').evaluate((grid) => [...grid.children].map((node) => ({
    id: node.getAttribute('data-testid'), opacity: getComputedStyle(node).opacity,
    animations: node.getAnimations().map((a) => ({ delay: a.effect?.getTiming().delay,
      fades: (a.effect as KeyframeEffect).getKeyframes().some((f) => f.opacity === '0') })),
  })));
  expect(motion.find((m) => m.id === 'item-a')?.opacity).toBe('1');
  expect(motion.find((m) => m.id === 'item-a')?.animations).toEqual([]);
  expect(motion.find((m) => m.id === 'item-d')?.animations).toEqual([{ delay: 0, fades: true }]);
  expect(motion.find((m) => m.id === 'item-e')?.animations).toEqual([{ delay: 100, fades: true }]);
  await expect.poll(() => page.getByTestId('layout-grid').evaluate((n) => n.getAnimations({ subtree: true }).length)).toBe(0);
});

test('exits stay inert until finished; moves and column changes preserve cards without fading', async ({ page }) => {
  const original = await page.getByTestId('item-c').elementHandle();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByTestId('item-b')).toHaveAttribute('inert', '');
  await expect(page.getByTestId('item-b')).toHaveAttribute('data-grid-layout-exit', '');
  expect(await page.getByTestId('item-c').evaluate((n) => n.getAnimations().some((a) =>
    (a.effect as KeyframeEffect).getKeyframes().some((f) => f.translate !== '0px')))).toBe(true);
  await expect(page.getByTestId('item-b')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect.poll(() => page.getByTestId('layout-grid').evaluate((n) => n.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByRole('button', { name: 'Reverse', exact: true }).click();
  expect(await page.getByTestId('item-c').evaluate((n, old) => n === old, original)).toBe(true);
  expect(await page.getByTestId('item-c').evaluate((n) => n.getAnimations().every((a) =>
    (a.effect as KeyframeEffect).getKeyframes().every((f) => f.opacity === undefined)))).toBe(true);
  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  expect(await page.getByTestId('item-a').evaluate((n) => n.getAnimations().length)).toBeGreaterThan(0);
  expect(await page.getByTestId('layout-grid').evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(4);
  await expect.poll(() => page.getByTestId('layout-grid').evaluate((n) => n.getAnimations({ subtree: true }).length)).toBe(0);
});

test('rapid reversal, reduced motion and unmount leave no stale exits or animations', async ({ page }) => {
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByTestId('item-b')).not.toHaveAttribute('inert');
  await page.getByRole('button', { name: 'Empty', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-grid-layout-key]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('[data-grid-layout-key]')).toHaveCount(3);
  expect(await page.getByTestId('layout-grid').evaluate((n) => n.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('button', { name: 'Mount', exact: true }).click();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('zero duration commits the final list immediately', async ({ page }) => {
  await page.getByRole('button', { name: 'Instant', exact: true }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByTestId('item-b')).toHaveCount(0);
  expect(await page.getByTestId('layout-grid').evaluate((n) => n.getAnimations({ subtree: true }).length)).toBe(0);
});
