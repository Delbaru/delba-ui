import { expect, test } from '@playwright/test';

test('closest source respects nested scopes, focus within and caller events', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?hover-motion');
    const card = page.getByTestId('hover-card');
    const image = page.locator('.ui-img').filter({ has: page.getByTestId('hover-image') });
    const icon = page.getByTestId('hover-inner').locator('[data-hover-motion]');
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await card.hover({ position: { x: 290, y: 180 } });
    await expect(image).toHaveAttribute('data-hover-active', '');
    await expect(icon).not.toHaveAttribute('data-hover-active', '');
    await expect(page.getByTestId('hover-events')).not.toHaveText('0');
    await expect.poll(() => image.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a)).toBeCloseTo(1.1, 2);
    await page.getByTestId('hover-inner').hover();
    await expect(icon).toHaveAttribute('data-hover-active', '');
    await page.mouse.move(0, 0);
    await page.getByTestId('hover-focus').focus();
    await expect(image).toHaveAttribute('data-hover-active', '');
    await expect(icon).not.toHaveAttribute('data-hover-active', '');
    await page.getByTestId('hover-parent-focus').focus();
    await expect(image).not.toHaveAttribute('data-hover-active', '');
    await expect(page.getByTestId('hover-text')).toHaveAttribute('data-hover-active', '');
    await expect.poll(() => image.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a)).toBeCloseTo(0.9, 2);
});

test('reduced motion preserves resting geometry through unmount/remount', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?hover-motion');
    await page.getByTestId('hover-card').hover();
    const image = page.locator('.ui-img').filter({ has: page.getByTestId('hover-image') });
    await expect(image).toHaveAttribute('data-hover-active', '');
    await expect.poll(() => image.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a)).toBeCloseTo(0.9, 2);
    await page.getByRole('button', { name: 'Toggle hover target' }).click();
    await expect(image).toHaveCount(0);
    await page.getByTestId('hover-card').hover();
    await page.getByRole('button', { name: 'Toggle hover target' }).click();
    await page.getByTestId('hover-card').hover();
    await expect(image).toHaveAttribute('data-hover-active', '');
    expect(errors).toEqual([]);
});
