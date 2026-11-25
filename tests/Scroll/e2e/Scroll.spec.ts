import { expect, test } from '@playwright/test';

test('ui.scroll decorates one Flex viewport and owns native scrolling', async ({ page }) => {
  await page.goto('/');
  const viewport = page.getByRole('region', { name: 'UI scroll surface' });
  await expect(viewport).toBeVisible();
  await expect(viewport).toHaveAttribute('data-scroll-preset', 'default');
  const geometry = await viewport.evaluate(node => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: getComputedStyle(node).overflowY,
    nestedScrollAreas: node.querySelectorAll('.ui-scroll-area').length,
  }));
  expect(geometry.clientHeight).toBeGreaterThan(0);
  expect(geometry.clientHeight).toBeLessThan(geometry.scrollHeight);
  expect(geometry.overflowY).toMatch(/auto|scroll/);
  expect(geometry.nestedScrollAreas).toBe(0);
  await viewport.evaluate(node => node.scrollTo(0, 120));
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
});
