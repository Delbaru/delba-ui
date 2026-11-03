import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/?native-carousel');
    await expect(page.getByRole('region', { name: 'Native fixture gallery' })).toHaveAttribute('data-carousel-ready', 'true');
});

test('one controller drives commands, shared dots, boundaries and responsive geometry', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    await expect(page.getByRole('button', { name: 'Native page 3' })).toBeVisible();
    await page.getByRole('button', { name: 'Next native', exact: true }).click();
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
    await expect(page.getByRole('button', { name: 'Native page 2', exact: true })).toHaveAttribute('aria-current', 'true');
    await root.focus();
    await page.keyboard.press('End');
    await expect(root).toHaveCSS('outline-style', 'solid');
    await expect(page.getByTestId('native-state')).toContainText('"index":2');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('native-state')).toContainText('"index":0');
    await page.setViewportSize({ width: 390, height: 840 });
    await expect(page.getByTestId('native-state')).toContainText('"pageCount":4');
    await page.getByRole('button', { name: 'Native page 4', exact: true }).click();
    await expect(page.getByTestId('native-state')).toContainText('"index":3');
    await expect(root.getByRole('textbox', { name: 'Input 1' })).toHaveCount(0);
    await expect(root.getByRole('textbox', { name: 'Input 4' })).toBeVisible();
    await root.getByRole('textbox', { name: 'Input 4' }).fill('Keep my input');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('native-state')).toContainText('"index":3');
});

test('real mouse drag changes page and interacting with a field keeps its input', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    const start = await root.locator('p').first().boundingBox();
    if (!start) throw new Error('Carousel drag target missing');
    await page.mouse.move(start.x + 180, start.y + 8);
    await page.mouse.down();
    await page.mouse.move(start.x + 15, start.y + 8, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
    await root.getByRole('textbox', { name: 'Input 2' }).fill('Typing works');
    await expect(root.getByRole('textbox', { name: 'Input 2' })).toHaveValue('Typing works');
});

test('interrupted commands settle once, cancellation and reverse preserve final position', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const results = await page.evaluate(async () => {
        const carousel = window.__nativeCarousel;
        if (!carousel) throw new Error('No controller');
        const first = carousel.goTo(2);
        await new Promise(resolve => setTimeout(resolve, 70));
        const second = carousel.goTo(0);
        return [await first.finished, await second.finished, carousel.getSnapshot().index];
    });
    expect(results).toEqual([{ status: 'interrupted' }, { status: 'finished' }, 0]);
    const cancelled = await page.evaluate(async () => {
        const transition = window.__nativeCarousel?.goTo(2);
        await new Promise(resolve => setTimeout(resolve, 60));
        transition?.cancel();
        return transition?.finished;
    });
    expect(cancelled).toEqual({ status: 'interrupted' });
    await page.evaluate(async () => { await window.__nativeCarousel?.goTo(0); });
    const reversed = await page.evaluate(async () => {
        const transition = window.__nativeCarousel?.goTo(2);
        await new Promise(resolve => setTimeout(resolve, 90));
        transition?.reverse();
        await transition;
        return window.__nativeCarousel?.getSnapshot().index;
    });
    expect(reversed).toBe(0);
});

test('autoplay respects hover, manual pause/stop, offscreen visibility and reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Play native', exact: true }).click();
    await page.mouse.move(1000, 700);
    await expect.poll(() => page.evaluate(() => window.__nativeCarousel?.getSnapshot().index)).not.toBe(0);
    await page.getByRole('region', { name: 'Native fixture gallery' }).hover();
    await expect(page.getByTestId('native-state')).toContainText('"paused":true');
    await page.evaluate(() => window.__nativeCarousel?.pause());
    await page.mouse.move(1000, 700);
    const paused = await page.evaluate(() => window.__nativeCarousel?.getSnapshot().index);
    await page.waitForTimeout(650);
    expect(await page.evaluate(() => window.__nativeCarousel?.getSnapshot().index)).toBe(paused);
    await page.evaluate(() => window.__nativeCarousel?.stop());
    await expect(page.getByTestId('native-state')).toContainText('"playing":false');
    await page.evaluate(() => window.__nativeCarousel?.play());
    await page.evaluate(() => window.scrollTo(0, 1400));
    await expect(page.getByTestId('native-state')).toContainText('"paused":true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByTestId('native-state')).toContainText('"paused":true');
});

test('unmount interrupts a pending transition, restores native content and permits reattachment', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const result = await page.evaluate(async () => {
        const transition = window.__nativeCarousel?.next();
        window.__toggleNativeCarousel?.();
        return transition?.finished;
    });
    expect(result).toEqual({ status: 'interrupted' });
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    await expect(root).toHaveCount(0);
    await page.evaluate(() => window.__toggleNativeCarousel?.());
    await expect(root).toHaveAttribute('data-carousel-ready', 'true');
    await page.getByRole('button', { name: 'Next native', exact: true }).click();
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
});

test('replacing the controller during a drag releases capture and clears the old gesture', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    const target = await root.locator('p').first().boundingBox();
    if (!target) throw new Error('Carousel drag target missing');
    await page.mouse.move(target.x + 180, target.y + 8);
    await page.mouse.down();
    await page.mouse.move(target.x + 80, target.y + 8, { steps: 8 });
    await expect(root).toHaveAttribute('data-dragging', 'true');
    await page.evaluate(() => window.__replaceNativeController?.());
    await expect(root).not.toHaveAttribute('data-dragging', 'true');
    expect(await root.evaluate(node => [node, ...node.querySelectorAll('*')].some(target => target.hasPointerCapture(1)))).toBe(false);
    await page.mouse.up();
    await page.getByRole('button', { name: 'Next native', exact: true }).click();
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
});

test('native touch swipes horizontally and vertical touch keeps document scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 840 });
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    await root.scrollIntoViewIfNeeded();
    const bounds = await root.locator('p').first().boundingBox();
    if (!bounds) throw new Error('Missing touch target');
    const x = bounds.x + 240;
    const y = bounds.y + 8;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 18, y }] });
        await page.waitForTimeout(12);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
    const current = await root.locator('p').nth(1).boundingBox();
    if (!current) throw new Error('Missing vertical touch target');
    const before = await page.evaluate(() => window.scrollY);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: current.x + 100, y: current.y + 20 }] });
    for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: current.x + 100, y: current.y + 20 - step * 15 }] });
        await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
    await session.detach();
});

test('changing any active page pauses media and preserves its unique mounted element', async ({ page }) => {
    await page.getByTestId('native-video').evaluate(async video => {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const context = canvas.getContext('2d');
        context?.fillRect(0, 0, 32, 32);
        video.srcObject = canvas.captureStream(1);
        await video.play();
    });
    await expect.poll(() => page.getByTestId('native-video').evaluate(video => video.paused)).toBe(false);
    await page.getByRole('button', { name: 'Next native', exact: true }).click();
    await expect.poll(() => page.getByTestId('native-video').evaluate(video => video.paused)).toBe(true);
    await expect(page.getByTestId('native-video')).toHaveCount(1);
    await page.getByRole('button', { name: 'Next native', exact: true }).click();
    await expect(page.getByTestId('native-video')).toHaveCount(1);
});

test('server HTML exposes every slide without JS and hydrates without mismatches', async ({ browser, request, page }) => {
    const response = await request.get('/ssr');
    expect(await response.text()).toContain('Server carousel three');
    const context = await browser.newContext({ javaScriptEnabled: false });
    const noJs = await context.newPage();
    await noJs.goto(new URL('/ssr', response.url()).href);
    await expect(noJs.getByRole('link', { name: 'Server carousel three' })).toBeVisible();
    await expect(noJs.getByRole('region', { name: 'Server carousel' })).not.toHaveAttribute('data-carousel-ready');
    await context.close();
    const hydration: string[] = [];
    page.on('console', message => { if (/hydration|did not match|hydrated.*match/i.test(message.text())) hydration.push(message.text()); });
    await page.goto('/ssr');
    await expect(page.getByRole('region', { name: 'Server carousel' })).toHaveAttribute('data-carousel-ready', 'true');
    expect(hydration).toEqual([]);
});

test('legacy adapter reports intermediate slide changes when edge state is unchanged', async ({ page }) => {
    await page.evaluate(() => { window.__legacyActiveIndices = []; });
    for (const index of [1, 2, 3, 2, 1, 0]) {
        await page.evaluate(value => window.__legacyCarousel?.goTo(value), index);
        await expect(page.locator('[data-carousel-id="legacy-index-fixture"] .swiper-slide-active')).toContainText(`Legacy slide ${index + 1}`);
    }
    expect(await page.evaluate(() => window.__legacyActiveIndices)).toEqual([1, 2, 3, 2, 1, 0]);
});

test('dynamic empty/single/multiple slides clamp selection while stable keyed input survives additions', async ({ page }) => {
    const field = page.getByRole('textbox', { name: 'Input 1', exact: true });
    await field.fill('Preserve this value');
    await page.evaluate(() => window.__setNativeCount?.(5));
    await expect(field).toHaveValue('Preserve this value');
    await page.evaluate(() => window.__nativeCarousel?.goTo(3));
    await expect(page.getByTestId('native-state')).toContainText('"index":3');
    await page.evaluate(() => window.__setNativeCount?.(1));
    await expect(page.getByTestId('native-state')).toContainText('"index":0');
    await expect(page.getByTestId('native-state')).toContainText('"pageCount":1');
    await page.evaluate(() => window.__setNativeCount?.(0));
    await expect(page.getByTestId('native-state')).toContainText('"pageCount":0');
    await page.evaluate(() => window.__nativeCarousel?.next());
    await page.evaluate(() => window.__setNativeCount?.(4));
    await expect(page.getByTestId('native-state')).toContainText('"pageCount":3');
    await page.getByRole('button', { name: 'Next native', exact: true }).click();
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
});

test('consumer event cancellation runs before keyboard and drag actions', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    await root.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(page.getByTestId('native-state')).toContainText('"index":0');
    const box = await root.locator('p').first().boundingBox();
    if (!box) throw new Error('Missing cancellation target');
    await page.keyboard.down('Shift');
    await page.mouse.move(box.x + 200, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 8, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('native-state')).toContainText('"index":0');
    await root.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
});

test('completed and reduced-motion Transition handles cannot undo the final selected page', async ({ page }) => {
    const instant = await page.evaluate(async () => {
        const carousel = window.__nativeCarousel;
        if (!carousel) throw new Error('No controller');
        const transition = carousel.goTo(2);
        transition.cancel(); transition.reverse();
        const result = await transition;
        return { result, index: carousel.getSnapshot().index, moving: carousel.getSnapshot().moving };
    });
    expect(instant).toEqual({ result: { status: 'finished' }, index: 2, moving: false });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const completed = await page.evaluate(async () => {
        const carousel = window.__nativeCarousel;
        if (!carousel) throw new Error('No controller');
        const transition = carousel.goTo(0);
        await transition;
        transition.reverse(); transition.cancel();
        return carousel.getSnapshot().index;
    });
    expect(completed).toBe(0);
});
