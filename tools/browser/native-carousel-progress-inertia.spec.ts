import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?native-carousel');
    await page.bringToFront();
    await expect(page.getByRole('region', { name: 'Native fixture gallery' })).toHaveAttribute('data-carousel-ready', 'true');
});

test('motion progress exposes fractional seeking and smooth threshold subscriptions with cleanup', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const controller = window.__nativeCarousel;
        if (!controller) throw new Error('Missing controller');
        controller.seek(0.35);
        const initial = controller.progress;
        const values: number[] = [];
        let crossings = 0;
        let previous = initial;
        const unsubscribe = controller.subscribeProgress(value => {
            values.push(value);
            if (previous < 0.5 && value >= 0.5) crossings++;
            previous = value;
        });
        await controller.goTo(2);
        const final = controller.progress;
        unsubscribe();
        const count = values.length;
        controller.seek(0.1);
        return { initial, final, values, crossings, detached: values.length === count, afterSeek: controller.progress };
    });
    expect(result.initial).toBeCloseTo(0.35, 4);
    expect(result.final).toBeCloseTo(1, 4);
    expect(result.values.some(value => value > 0.35 && value < 1)).toBe(true);
    expect(result.crossings).toBe(1);
    expect(result.detached).toBe(true);
    expect(result.afterSeek).toBeCloseTo(0.1, 4);
});

test('generated motion tuning reaches the real drag activation threshold', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    await root.evaluate(node => {
        node.style.setProperty('--t-m-carousel-drag-threshold', '240');
        node.style.setProperty('--t-m-carousel-inertia-duration', '810ms');
        window.dispatchEvent(new Event('resize'));
    });
    const bounds = await root.boundingBox();
    if (!bounds) throw new Error('Missing gallery bounds');
    const x = bounds.x + bounds.width * 0.75;
    const y = bounds.y + bounds.height * 0.75;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 120, y, { steps: 8 });
    await page.mouse.up();
    expect(await page.evaluate(() => window.__nativeCarousel?.getSnapshot().index)).toBe(0);
    await root.evaluate(node => {
        node.style.setProperty('--t-m-carousel-drag-threshold', '12');
        window.dispatchEvent(new Event('resize'));
    });
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 190, y, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId('native-state')).toContainText('"index":1');
});

test('recent release velocity adds bounded inertia; reduced motion removes the projection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 840 });
    await page.evaluate(() => window.__setNativeCount?.(8));
    const root = page.getByRole('region', { name: 'Native fixture gallery' });
    const drag = async (inertia: boolean) => {
        await page.evaluate(async value => { window.__setNativeInertia?.(value); await window.__nativeCarousel?.goTo(0); }, inertia);
        await expect(page.getByTestId('native-state')).toContainText('"index":0');
        const box = await root.locator('p').first().boundingBox();
        if (!box) throw new Error('Missing inertia target');
        await page.mouse.move(box.x + 240, box.y + 8);
        await page.mouse.down();
        await page.mouse.move(box.x + 130, box.y + 8, { steps: 4 });
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => window.__nativeCarousel?.getSnapshot().moving)).toBe(false);
        return page.evaluate(() => window.__nativeCarousel?.getSnapshot().index ?? -1);
    };
    const baseline = await drag(false);
    const momentum = await drag(true);
    expect(baseline).toBe(1);
    expect(momentum).toBeGreaterThan(baseline);
    expect(momentum).toBeLessThanOrEqual(4);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await drag(true);
    expect(reduced).toBeLessThanOrEqual(1);
});

test('100 original slides wrap with no frame geometry reads and writes only to repositioned children', async ({ page }) => {
    await page.evaluate(() => { window.__setNativeCount?.(100); window.__setNativeLoop?.(true); });
    await expect(page.getByTestId('native-state')).toContainText('"looping":true');
    await page.waitForTimeout(100);
    const result = await page.evaluate(async () => {
        const root = document.querySelector('[aria-label="Native fixture gallery"]');
        const track = root?.firstElementChild?.firstElementChild;
        const controller = window.__nativeCarousel;
        if (!(root instanceof HTMLElement) || !(track instanceof HTMLElement) || !controller) throw new Error('Missing loop');
        const computed = window.getComputedStyle;
        const bounds = Element.prototype.getBoundingClientRect;
        let styleReads = 0;
        let rectReads = 0;
        let childWrites = 0;
        window.getComputedStyle = (element, pseudo) => { if (element === root || element === track) styleReads++; return computed.call(window, element, pseudo); };
        Element.prototype.getBoundingClientRect = function() { if (this === root || track.contains(this)) rectReads++; return bounds.call(this); };
        const observer = new MutationObserver(records => { childWrites += records.filter(record => record.target.parentElement === track).length; });
        observer.observe(track, { subtree: true, attributes: true, attributeFilter: ['style'] });
        try {
            await controller.next();
            await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
            return { styleReads, rectReads, childWrites, slides: track.children.length, index: controller.getSnapshot().index };
        } finally { observer.disconnect(); window.getComputedStyle = computed; Element.prototype.getBoundingClientRect = bounds; }
    });
    expect(result.slides).toBe(100);
    expect(result.index).toBe(1);
    expect(result.rectReads).toBe(0);
    expect(result.styleReads).toBe(0);
    expect(result.childWrites).toBeGreaterThan(0);
    expect(result.childWrites).toBeLessThanOrEqual(2);
});
