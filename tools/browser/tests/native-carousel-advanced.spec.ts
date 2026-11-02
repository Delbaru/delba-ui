import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/?native-carousel-advanced');
    await expect(page.getByRole('region', { name: 'Advanced loop', exact: true })).toHaveAttribute('data-carousel-ready', 'true');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('continuous wrap moves forward through the seam with unique persistent slides and media', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Advanced loop', exact: true });
    await root.getByRole('textbox', { name: 'Unique loop input' }).fill('Persistent variant input');
    await page.getByTestId('loop-video').evaluate(async video => {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        canvas.getContext('2d')?.fillRect(0, 0, 32, 32);
        video.srcObject = canvas.captureStream(1);
        video.dataset.identity = 'original';
        await video.play();
    });
    await page.evaluate(async () => { await window.__advancedCarousels?.loop.goTo(5); });
    await expect(page.getByTestId('advanced-loop-state')).toContainText('"looping":true');
    const first = root.locator('[data-source-slide="Loop-0"]');
    const start = await first.boundingBox();
    if (!start) throw new Error('First source slide missing at loop seam');
    await page.evaluate(() => { void window.__advancedCarousels?.loop.next(); });
    await page.waitForTimeout(100);
    const middle = await first.boundingBox();
    if (!middle) throw new Error('Source slide missing during wrap');
    expect(middle.x).toBeLessThan(start.x - 1);
    expect(middle.x).toBeGreaterThan(start.x - 308);
    await expect.poll(() => page.evaluate(() => window.__advancedCarousels?.loop.getSnapshot().moving)).toBe(false);
    await expect(page.getByTestId('advanced-loop-state')).toContainText('"index":0');
    const end = await first.boundingBox();
    if (!end) throw new Error('First source slide missing after wrap');
    expect(end.x).toBeLessThan(middle.x);
    await expect(root.locator('[data-source-slide]')).toHaveCount(6);
    await expect(page.getByTestId('loop-video')).toHaveCount(1);
    await expect(page.getByTestId('loop-video')).toHaveAttribute('data-identity', 'original');
    await expect(root.getByRole('textbox', { name: 'Unique loop input' })).toHaveValue('Persistent variant input');
    await page.evaluate(async () => { await window.__advancedCarousels?.loop.goTo(2); });
    await expect.poll(() => page.getByTestId('loop-video').evaluate(video => video.paused)).toBe(true);
});

test('vertical mouse drag, wheel and keyboard share one position while wheel outside scrolls the document', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Advanced vertical', exact: true });
    await root.scrollIntoViewIfNeeded();
    const box = await root.locator('p').first().boundingBox();
    if (!box) throw new Error('Vertical drag target missing');
    await page.mouse.move(box.x + 90, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y - 180, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":1');
    await expect.poll(() => page.evaluate(() => window.__advancedCarousels?.vertical.getSnapshot().moving)).toBe(false);
    await root.hover();
    await page.mouse.wheel(0, 120);
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":2');
    await root.focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":1');
    await page.keyboard.press('End');
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":3');
    await page.keyboard.press('Home');
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":0');
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(1000, 400);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":0');
});

test('vertical native touch follows the carousel axis without moving the document', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 840 });
    const root = page.getByRole('region', { name: 'Advanced vertical', exact: true });
    await root.scrollIntoViewIfNeeded();
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const box = await root.boundingBox();
    if (!box) throw new Error('Missing touch target');
    const x = box.x + 140;
    const y = box.y + 270;
    const before = await page.evaluate(() => window.scrollY);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 16 }] });
        await page.waitForTimeout(12);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('advanced-vertical-state')).toContainText('"index":1');
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await session.detach();
});

test('autoplay progress and remaining time hold, resume and reset without React frame renders', async ({ page }) => {
    await page.mouse.move(1000, 200);
    await page.evaluate(() => { window.__advancedCarousels?.loop.play(); });
    await expect.poll(() => page.evaluate(() => window.__advancedCarousels?.loop.getPlaybackSnapshot().progress ?? 0)).toBeGreaterThan(0.1);
    const before = await page.evaluate(() => ({ renders: window.__advancedContentRenders,
        progress: window.__advancedCarousels?.loop.getPlaybackSnapshot().progress }));
    await page.waitForTimeout(120);
    expect(await page.evaluate(() => window.__advancedContentRenders)).toBe(before.renders);
    await expect(page.getByTestId('advanced-timer')).not.toHaveText('0% / 0.00s');
    const fill = await page.getByTestId('advanced-progress').locator(':scope > *').evaluate(bar => ({
        background: getComputedStyle(bar).backgroundColor, width: bar.getBoundingClientRect().width,
    }));
    expect(fill.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(fill.width).toBeGreaterThan(0);
    await page.evaluate(() => window.__advancedCarousels?.loop.pause());
    const held = await page.evaluate(() => window.__advancedCarousels?.loop.getPlaybackSnapshot());
    expect(held?.paused).toBe(true);
    expect(held?.remaining).toBeGreaterThan(0);
    expect(held?.remaining).toBeLessThan(1.5);
    await page.waitForTimeout(250);
    const paused = await page.evaluate(() => window.__advancedCarousels?.loop.getPlaybackSnapshot());
    expect(paused?.progress).toBe(held?.progress);
    expect(paused?.remaining).toBe(held?.remaining);
    await page.evaluate(() => window.__advancedCarousels?.loop.play());
    await expect.poll(() => page.evaluate(() => window.__advancedCarousels?.loop.getPlaybackSnapshot().progress ?? 0)).toBeGreaterThan(held?.progress ?? 0);
    await page.evaluate(() => window.__advancedCarousels?.loop.stop());
    const stopped = await page.evaluate(() => window.__advancedCarousels?.loop.getPlaybackSnapshot());
    expect(stopped?.progress).toBe(0);
    expect(stopped?.playing).toBe(false);
    await expect(page.getByTestId('advanced-progress')).toHaveAttribute('aria-valuenow', '0');
    const frames = await page.evaluate(async () => {
        let count = 0;
        const request = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) { count++; return request.call(window, callback); };
        await new Promise(resolve => setTimeout(resolve, 180));
        window.requestAnimationFrame = request;
        return count;
    });
    expect(frames).toBe(0);
});

test('independent controllers synchronize both directions, clamp a strip and clean subscriptions on remount', async ({ page }) => {
    await page.evaluate(() => window.__advancedCarousels?.main.goTo(5));
    await expect(page.getByTestId('advanced-main-state')).toContainText('"index":5');
    await expect(page.getByTestId('advanced-strip-state')).toContainText('"index":3');
    await page.evaluate(() => window.__advancedCarousels?.strip.goTo(1));
    await expect(page.getByTestId('advanced-main-state')).toContainText('"index":1');
    await page.evaluate(() => window.__toggleAdvancedPartners?.());
    await expect(page.getByRole('region', { name: 'Synchronized main', exact: true })).toHaveCount(0);
    await page.evaluate(() => window.__toggleAdvancedPartners?.());
    await expect(page.getByRole('region', { name: 'Synchronized strip', exact: true })).toHaveAttribute('data-carousel-ready', 'true');
    const changes = await page.evaluate(() => {
        const controllers = window.__advancedCarousels;
        if (!controllers) throw new Error('Missing sync controllers');
        let main = 0;
        let strip = 0;
        const stopMain = controllers.main.subscribe(() => { main++; });
        const stopStrip = controllers.strip.subscribe(() => { strip++; });
        controllers.main.goTo(2);
        stopMain(); stopStrip();
        return { main, strip, mainIndex: controllers.main.getSnapshot().index, stripIndex: controllers.strip.getSnapshot().index };
    });
    expect(changes).toEqual({ main: 1, strip: 1, mainIndex: 2, stripIndex: 2 });
});
