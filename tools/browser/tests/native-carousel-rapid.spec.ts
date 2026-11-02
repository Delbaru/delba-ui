import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?native-carousel-advanced');
    await page.bringToFront();
    await expect(page.getByRole('region', { name: 'Advanced loop', exact: true }))
        .toHaveAttribute('data-carousel-ready', 'true');
});

for (const direction of [1, -1] as const) {
    test(`ten rapid ${direction === 1 ? 'next' : 'previous'} commands preserve physical direction and continuity`, async ({ page }) => {
        const result = await page.evaluate(async direction => {
            const controller = window.__advancedCarousels?.loop;
            const root = document.querySelector('[aria-label="Advanced loop"]');
            const track = root?.firstElementChild?.firstElementChild;
            if (!controller || !root || !(track instanceof HTMLElement)) throw new Error('Missing mounted loop');
            const position = () => -new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
            const samples = [];
            let last = controller.goTo(0);
            await last;
            for (let index = 0; index < 10; index++) {
                const before = position();
                last = direction === 1 ? controller.next() : controller.prev();
                const after = position();
                await new Promise(resolve => setTimeout(resolve, 25));
                samples.push({ before, after, later: position() });
            }
            const outcome = await last;
            return { samples, outcome, state: controller.getSnapshot() };
        }, direction);
        for (const sample of result.samples) {
            // Replacing an in-flight animation must retain its currently painted position.
            expect(Math.abs(sample.after - sample.before)).toBeLessThan(1);
            // A burst of next commands must never choose a closer cycle behind the viewport.
            expect((sample.later - sample.after) * direction).toBeGreaterThanOrEqual(-0.5);
        }
        expect(result.outcome.status).toBe('finished');
        expect(result.state.index).toBe(direction === 1 ? 4 : 2);
        expect(result.state.moving).toBe(false);
    });
}

test('absolute goTo replaces queued directional intent and takes the nearest physical cycle', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const controller = window.__advancedCarousels?.loop;
        const root = document.querySelector('[aria-label="Advanced loop"]');
        const track = root?.firstElementChild?.firstElementChild;
        if (!controller || !root || !(track instanceof HTMLElement)) throw new Error('Missing mounted loop');
        const position = () => -new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
        const first = controller.next();
        await new Promise(resolve => setTimeout(resolve, 25));
        const second = controller.next();
        await new Promise(resolve => setTimeout(resolve, 25));
        const before = position();
        const absolute = controller.goTo(5);
        const after = position();
        const animation = track.getAnimations()[0];
        const keyframes = animation?.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
        const end = keyframes.at(-1)?.transform;
        const target = typeof end === 'string' ? -new DOMMatrixReadOnly(end).m41 : after;
        const slide = track.firstElementChild;
        const span = (slide?.getBoundingClientRect().width ?? 0) + Number.parseFloat(getComputedStyle(root).gap);
        const outcome = await absolute;
        return { before, after, target, span, outcome, first: await first, second: await second, state: controller.getSnapshot() };
    });
    expect(Math.abs(result.after - result.before)).toBeLessThan(1);
    expect(Math.abs(result.target - result.before)).toBeLessThanOrEqual(result.span * 3 + 1);
    expect(result.first.status).toBe('interrupted');
    expect(result.second.status).toBe('interrupted');
    expect(result.outcome.status).toBe('finished');
    expect(result.state.index).toBe(5);
});

test('opposite command halfway through the seam retains the painted position and changes direction', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const controller = window.__advancedCarousels?.loop;
        const root = document.querySelector('[aria-label="Advanced loop"]');
        const track = root?.firstElementChild?.firstElementChild;
        if (!controller || !root || !(track instanceof HTMLElement)) throw new Error('Missing mounted loop');
        const position = () => -new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
        await controller.goTo(5);
        const forward = controller.next();
        await new Promise(resolve => setTimeout(resolve, 120));
        const before = position();
        const reverse = controller.prev();
        const after = position();
        await new Promise(resolve => setTimeout(resolve, 80));
        const later = position();
        const outcome = await reverse;
        return { before, after, later, outcome, forward: await forward, state: controller.getSnapshot() };
    });
    expect(Math.abs(result.after - result.before)).toBeLessThan(1);
    expect(result.later).toBeLessThan(result.after);
    expect(result.forward.status).toBe('interrupted');
    expect(result.outcome.status).toBe('finished');
    expect(result.state.index).toBe(5);
});

test('Transition.reverse halfway through a seam is continuous and completes at its original slide', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const controller = window.__advancedCarousels?.loop;
        const root = document.querySelector('[aria-label="Advanced loop"]');
        const track = root?.firstElementChild?.firstElementChild;
        if (!controller || !root || !(track instanceof HTMLElement)) throw new Error('Missing mounted loop');
        const position = () => -new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
        await controller.goTo(5);
        const transition = controller.next();
        await new Promise(resolve => setTimeout(resolve, 120));
        const before = position();
        transition.reverse();
        const after = position();
        await new Promise(resolve => setTimeout(resolve, 50));
        const later = position();
        const outcome = await transition;
        return { before, after, later, outcome, state: controller.getSnapshot() };
    });
    expect(Math.abs(result.after - result.before)).toBeLessThan(1);
    expect(result.later).toBeLessThan(result.after);
    expect(result.outcome.status).toBe('finished');
    expect(result.state.index).toBe(5);
});

test('carousel transitions retain native timing when composed with together and sequence', async ({ page }) => {
    const results = await page.evaluate(async () => {
        const controller = window.__advancedCarousels?.loop;
        const motion = window.__advancedMotion;
        if (!controller || !motion) throw new Error('Missing motion composition fixture');
        const results = [];
        for (const kind of ['together', 'sequence'] as const) {
            await controller.goTo(0);
            const group = kind === 'together' ? motion.together(controller.next())
                : motion.sequence(() => controller.next(), () => controller.next());
            const progress: number[] = [];
            let endMarker = false;
            let finished = false;
            group.on('progress', value => progress.push(value));
            group.at('end', () => { endMarker = true; });
            void group.finished.then(() => { finished = true; });
            await new Promise(resolve => setTimeout(resolve, 80));
            const early = { progress: [...progress], endMarker, finished, moving: controller.getSnapshot().moving };
            const outcome = await group;
            await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
            results.push({ kind, early, outcome, endMarker, index: controller.getSnapshot().index });
        }
        return results;
    });
    for (const result of results) {
        expect(result.early.moving).toBe(true);
        expect(result.early.finished).toBe(false);
        expect(result.early.endMarker).toBe(false);
        expect(result.early.progress.length).toBeGreaterThan(0);
        expect(result.early.progress.every(value => value >= 0 && value < 1)).toBe(true);
        expect(result.outcome.status).toBe('finished');
        expect(result.endMarker).toBe(true);
        expect(result.index).toBe(result.kind === 'together' ? 1 : 2);
    }
});

test('a cancelled native touch does not swallow the next intentional link click', async ({ page }) => {
    await page.goto('/?native-carousel');
    const root = page.getByRole('region', { name: 'Native fixture gallery', exact: true });
    await expect(root).toHaveAttribute('data-carousel-ready', 'true');
    await root.scrollIntoViewIfNeeded();
    const box = await root.boundingBox();
    if (!box) throw new Error('Missing native touch target');
    const session = await page.context().newCDPSession(page);
    try {
        await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
        const x = box.x + box.width * 0.8;
        const y = box.y + 30;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 8; step++) {
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 12, y }] });
            await page.waitForTimeout(12);
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await expect.poll(() => page.evaluate(() => window.__nativeCarousel?.getSnapshot().moving)).toBe(false);
        const link = root.getByRole('link').first();
        const href = await link.getAttribute('href');
        if (!href) throw new Error('Missing native link destination');
        await link.click();
        await expect.poll(() => page.evaluate(() => location.hash)).toBe(href);
    } finally {
        await session.detach();
    }
});

for (const delay of [100, 150, 250]) {
    test(`two next commands ${delay}ms apart keep position and velocity through ordinary and wrap slides`, async ({ page }) => {
        const results = await page.evaluate(async delay => {
            const controller = window.__advancedCarousels?.loop;
            const track = document.querySelector('[aria-label="Advanced loop"]')?.firstElementChild?.firstElementChild;
            if (!controller || !(track instanceof HTMLElement)) throw new Error('Missing loop');
            const position = () => -new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
            const results = [];
            for (const initial of [0, 5]) {
                await controller.goTo(initial);
                const first = controller.next();
                await new Promise(resolve => setTimeout(resolve, delay - 25));
                const previous = position();
                const previousTime = performance.now();
                await new Promise(resolve => setTimeout(resolve, 25));
                const before = position();
                const at = performance.now();
                const second = controller.next();
                const after = position();
                const samples: { time: number; position: number }[] = [];
                let settled = false;
                let frame = 0;
                const sampleFrame = () => {
                    samples.push({ time: performance.now(), position: position() });
                    if (!settled) frame = requestAnimationFrame(sampleFrame);
                };
                frame = requestAnimationFrame(sampleFrame);
                const outcome = await second;
                settled = true;
                cancelAnimationFrame(frame);
                const forwardSamples = [{ time: at, position: after }];
                for (const sample of samples) {
                    const last = forwardSamples[forwardSamples.length - 1];
                    if (last && sample.position > last.position + 0.01) forwardSamples.push(sample);
                }
                const firstProgress = forwardSamples[1];
                const lastProgress = forwardSamples[forwardSamples.length - 1];
                const later = lastProgress?.position ?? after;
                const newVelocity = firstProgress && lastProgress && lastProgress.time > at
                    ? (lastProgress.position - after) / (lastProgress.time - at)
                    : 0;
                results.push({ initial, previous, before, after, later, newVelocity,
                    oldVelocity: (before - previous) / (at - previousTime),
                    forwardFrames: forwardSamples.length - 1,
                    outcome, first: await first, final: controller.getSnapshot().index });
            }
            return results;
        }, delay);
        for (const result of results) {
            expect(Math.abs(result.after - result.before)).toBeLessThan(1);
            expect(result.later).toBeGreaterThan(result.after);
            expect(result.forwardFrames).toBeGreaterThan(1);
            expect(result.newVelocity).toBeGreaterThan(result.oldVelocity * 0.2);
            expect(result.newVelocity).toBeLessThan(Math.max(0.5, result.oldVelocity) * 5);
            expect(result.first.status).toBe('interrupted');
            expect(result.outcome.status).toBe('finished');
            expect(result.final).toBe((result.initial + 2) % 6);
        }
    });
}

test('a tap or cross-axis gesture during a pending animation does not strand the track between slides', async ({ page }) => {
    const root = page.getByRole('region', { name: 'Advanced loop', exact: true });
    await root.scrollIntoViewIfNeeded();
    for (const gesture of ['tap', 'cross-axis']) {
        await page.evaluate(async () => { await window.__advancedCarousels?.loop.goTo(0); });
        await page.evaluate(() => { window.__advancedCarousels?.loop.goTo(2); });
        await page.waitForTimeout(70);
        const box = await root.boundingBox();
        if (!box) throw new Error('Missing tap target');
        const x = box.x + box.width * 0.75;
        const y = box.y + box.height * 0.85;
        await page.mouse.move(x, y);
        await page.mouse.down();
        if (gesture === 'cross-axis') await page.mouse.move(x, y - 40, { steps: 4 });
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => window.__advancedCarousels?.loop.getSnapshot().moving)).toBe(false);
        expect(await page.evaluate(() => window.__advancedCarousels?.loop.getSnapshot().index)).toBe(2);
        expect(await page.evaluate(() => window.__advancedCarousels?.loop.progress)).toBeCloseTo(2 / 6, 3);
    }
});

