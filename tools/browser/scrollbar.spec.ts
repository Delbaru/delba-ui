import { expect, test, type Locator, type Page } from '@playwright/test';

// Headless Chromium otherwise removes the actual native scrollbar while retaining computed CSS.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] }, reducedMotion: 'no-preference' });

const alpha = (area: Locator) => area.evaluate(node => Number(getComputedStyle(node).getPropertyValue('--ui-scrollbar-opacity')));
const paint = (area: Locator) => area.evaluate(node => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing 2d context');
    context.fillStyle = getComputedStyle(node, '::-webkit-scrollbar-thumb').backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
});

async function open(page: Page) {
    await page.goto('/');
    const area = page.getByTestId('scroll-area');
    await area.scrollIntoViewIfNeeded();
    // Make the timing samples robust on CI while testing real per-viewport overrides.
    await area.evaluate(node => { node.style.setProperty('--ui-scrollbar-show-duration', '0.4s'); node.style.setProperty('--ui-scrollbar-fade-duration', '0.4s'); });
    await page.mouse.move(5, 5);
    await expect.poll(() => alpha(area)).toBe(0);
    return area;
}

test('native thumb fades in and out, holds after leave, and preserves layout', async ({ page }, info) => {
    const area = await open(page);
    const box = await area.boundingBox();
    const hidden = await area.screenshot();
    await area.hover();
    await page.waitForTimeout(100);
    const entering = await paint(area);
    expect(entering[3]).toBeGreaterThan(0);
    expect(entering[3]).toBeLessThan(255);
    await expect.poll(() => alpha(area)).toBe(1);
    expect(await paint(area)).toEqual([120, 120, 120, 255]);
    const shown = await area.screenshot();
    expect(shown.equals(hidden)).toBe(false);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(150);
    expect(await alpha(area)).toBe(1);
    await expect(area).not.toHaveAttribute('data-ui-scrollbar-active');
    await page.waitForTimeout(80);
    const leaving = await paint(area);
    expect(leaving[3]).toBeGreaterThan(0);
    expect(leaving[3]).toBeLessThan(255);
    await expect.poll(() => alpha(area)).toBe(0);
    expect((await paint(area))[3]).toBe(0);
    expect(await area.boundingBox()).toEqual(box);
    await info.attach('native-thumb-visible', { body: shown, contentType: 'image/png' });
    await info.attach('native-thumb-hidden', { body: hidden, contentType: 'image/png' });
});

test('native thumb drag stays visible outside the viewport until release', async ({ page }) => {
    const area = await open(page);
    await area.hover();
    await expect.poll(() => alpha(area)).toBe(1);
    const box = await area.boundingBox();
    if (!box) throw new Error('Missing native viewport');
    const gutter = await area.evaluate(node => node.offsetWidth - node.clientWidth);
    expect(gutter).toBeGreaterThan(0);
    const x = box.x + box.width - Math.max(0.5, gutter / 2);
    await page.mouse.move(x, box.y + 12);
    await page.mouse.down();
    await page.mouse.move(x, box.y + 65, { steps: 8 });
    await expect.poll(() => area.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await page.mouse.move(box.x + box.width + 20, box.y + 100, { steps: 8 });
    await page.waitForTimeout(800);
    expect(await alpha(area)).toBe(1);
    await page.mouse.up();
    await expect.poll(() => alpha(area)).toBe(0);
});

test('keyboard and programmatic scrolling reveal without hover, then expire; reduced motion is immediate', async ({ page }) => {
    const area = await open(page);
    await area.focus();
    await page.keyboard.press('Control+End');
    await expect.poll(() => area.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await expect.poll(() => alpha(area)).toBe(1);
    await page.getByRole('textbox', { name: 'Pinned scroll search' }).focus();
    await expect.poll(() => alpha(area)).toBe(0);
    await area.evaluate(node => node.scrollTo(0, 80));
    await expect.poll(() => alpha(area)).toBeGreaterThan(0);
    await expect.poll(() => alpha(area)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await area.hover();
    await expect(area).toHaveCSS('transition-duration', '0s');
    await expect.poll(() => alpha(area)).toBe(1);
    await page.mouse.move(5, 5);
    await expect.poll(() => alpha(area)).toBe(0);
});

test('plain helper has a visible fallback without runtime and supports opt-out', async ({ page }) => {
    const area = await open(page);
    await area.evaluate(node => node.style.setProperty('--ui-scrollbar-rest-opacity', '1'));
    await expect.poll(() => alpha(area)).toBe(1);
    await area.evaluate(node => node.style.setProperty('--ui-scrollbar-rest-opacity', '0'));
    await expect.poll(() => alpha(area)).toBe(0);
    // Model SSR/no runtime: custom scrollbar geometry remains available to native input.
    await page.evaluate(() => document.documentElement.removeAttribute('data-ui-scrollbar-ready'));
    await expect.poll(() => alpha(area)).toBe(1);
});
