import { expect, test } from '@playwright/test';

const cases = [
  { width: 320, height: 844, top: undefined, rpx: undefined, constrained: false },
  { width: 390, height: 844, top: undefined, rpx: undefined, constrained: false },
  { width: 390, height: 844, top: 397, rpx: 1, constrained: true },
  { width: 740, height: 380, top: 196, rpx: 2, constrained: true },
];

for (const { width, height, top, rpx, constrained } of cases) {
  test(`date popup fits ${width}x${height} at ${top ?? 'lower edge'} with rpx ${rpx ?? 'theme'}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    if (rpx) await page.evaluate(value => document.documentElement.style.setProperty('--rpx', `${value}px`), rpx);
    const field = page.getByTestId('calendar-control');
    await field.evaluate((node, top) => {
      node.style.cssText = `position:fixed;left:38px;${top === undefined ? 'bottom:24px' : `top:${top}px`};width:calc(100vw - 76px);z-index:1`;
    }, top);
    const date = page.getByTestId('keyboard-date');
    await field.getByRole('button', { name: 'Открыть календарь', exact: true }).click();
    const calendar = page.getByRole('group', { name: 'Открыть календарь', exact: true });
    await expect(calendar).toBeVisible();
    const scrollSurface = calendar.locator('..');
    await expect(scrollSurface).toHaveAttribute('data-scroll', 'y');
    await expect.poll(async () => {
      const anchor = await field.boundingBox();
      const surface = await scrollSurface.boundingBox();
      if (!anchor || !surface) return false;
      return Math.abs(surface.x - anchor.x) < 1
        && Math.abs(surface.width - anchor.width) < 1
        && surface.x >= 8
        && surface.x + surface.width <= width - 8
        && surface.y >= 8
        && surface.y + surface.height <= height - 8
        && (surface.y + surface.height < anchor.y || surface.y > anchor.y + anchor.height);
    }).toBe(true);
    const overflow = await scrollSurface.evaluate(node => node.scrollWidth > node.clientWidth + 1);
    expect(overflow).toBe(false);
    await date.press('Tab');
    await expect(calendar.getByRole('button', { name: 'Previous month', exact: true })).toBeFocused();
    const lastDay = calendar.locator('button[aria-pressed]').last();
    if (rpx) expect((await lastDay.boundingBox())?.height).toBeCloseTo(40 * rpx, 0);
    await lastDay.scrollIntoViewIfNeeded();
    if (constrained) {
      expect(await scrollSurface.evaluate(node => node.scrollHeight > node.clientHeight && node.scrollTop > 0)).toBe(true);
    }
    const lastBounds = await lastDay.boundingBox();
    const surfaceBounds = await scrollSurface.boundingBox();
    expect(lastBounds && surfaceBounds && lastBounds.y + lastBounds.height <= surfaceBounds.y + surfaceBounds.height + 1).toBe(true);
    await page.keyboard.press('Escape');
    await expect(calendar).toHaveCount(0);
    await expect(date).toBeFocused();
    await expect(date).toHaveValue('15.01.2025');
  });
}
