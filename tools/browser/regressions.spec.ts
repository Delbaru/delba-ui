import { expect, test, type Page } from '@playwright/test';

async function openFixture(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Delba UI browser regression fixture' })).toBeVisible();
}

test('interaction scope holds portal controls and releases them on close and unmount', async ({ page }) => {
  await openFixture(page);
  const active = page.getByTestId('interaction-scope-state');
  const root = page.getByTestId('interaction-scope-root');
  await page.mouse.move(1, 1);
  await expect(active).toHaveText('false');
  await expect(root).toHaveAttribute('state', 'compact hide');
  await page.getByRole('button', { name: 'Outside interaction scope', exact: true }).click();
  await page.mouse.move(1, 1);
  await page.keyboard.press('Tab');
  await expect(active).toHaveText('false');
  await page.keyboard.press('Tab');
  await expect(active).toHaveText('true');
  await expect(root).toHaveAttribute('state', 'compact hide interacting');
  await page.keyboard.press('Shift+Tab');
  await expect(active).toHaveText('false');
  await page.getByRole('button', { name: 'Open scoped dropdown', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(page.getByRole('button', { name: 'Close scoped dropdown', exact: true })).toBeVisible();
  await expect(active).toHaveText('true');
  await page.getByRole('button', { name: 'Close scoped dropdown', exact: true }).click();
  await expect(active).toHaveText('true');
  await page.getByRole('button', { name: 'Outside interaction scope', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(active).toHaveText('false');
  await page.getByRole('button', { name: 'Open scoped modal', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(page.getByRole('dialog', { name: 'Scoped modal', exact: true })).toBeVisible();
  await expect(active).toHaveText('true');
  await page.keyboard.press('Escape');
  await expect(active).toHaveText('true');
  await page.getByRole('button', { name: 'Outside interaction scope', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(active).toHaveText('false');
  await page.getByRole('button', { name: 'Open scoped dropdown', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle scoped controls', exact: true }).click();
  await page.mouse.move(1, 1);
  await expect(active).toHaveText('false');
  await expect(page.getByRole('button', { name: 'Close scoped dropdown', exact: true })).toHaveCount(0);
});

test('smooth scroll caches the range and refreshes it when page content grows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?smooth');
  await expect(page.getByRole('heading', { name: 'Delba UI browser regression fixture' })).toBeVisible();
  const result = await page.evaluate(async () => {
    const root = document.documentElement;
    const getter = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')?.get;
    if (!getter) throw new Error('Missing native scrollHeight getter');
    let reads = 0;
    Object.defineProperty(root, 'scrollHeight', { configurable: true, get: () => { reads++; return getter.call(root); } });
    const engine = window.__createSmoothScroll({ lerp: 0.1, wheelMultiplier: 1, duration: 0.1, easing: (x: number) => x, offset: 0, mobile: true, anchors: false, updateHash: false });
    const content = document.createElement('div');
    content.style.height = '1000px';
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      reads = 0;
      engine.scrollTo(300);
      await new Promise((resolve) => setTimeout(resolve, 250));
      const duringScroll = reads;
      const previousMaximum = getter.call(root) - innerHeight;
      document.body.append(content);
      await new Promise((resolve) => setTimeout(resolve, 100));
      engine.scrollTo(Number.MAX_SAFE_INTEGER, { immediate: true });
      const maximum = getter.call(root) - innerHeight;
      const reachedEnd = Math.abs(scrollY - maximum) < 2;
      content.style.height = '2000px';
      engine.scrollTo(Number.MAX_SAFE_INTEGER, { immediate: true });
      const synchronousResize = Math.abs(scrollY - (getter.call(root) - innerHeight)) < 2;
      engine.scrollTo(0, { duration: 0.5 });
      await new Promise((resolve) => setTimeout(resolve, 75));
      window.scrollTo({ top: 500, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 250));
      return { duringScroll, grew: maximum > previousMaximum, reachedEnd, synchronousResize, manualInterrupt: Math.abs(scrollY - 500) < 2 };
    } finally {
      engine.destroy();
      Reflect.deleteProperty(root, 'scrollHeight');
      content.remove();
    }
  });
  expect(result).toEqual({ duringScroll: 1, grew: true, reachedEnd: true, synchronousResize: true, manualInterrupt: true });
});

test('gradient frame keeps a transparent center, radius and live button across breakpoints', async ({ page }) => {
  await openFixture(page);
  const frame = page.getByTestId('gradient-frame');
  await frame.scrollIntoViewIfNeeded();
  const border = frame.locator('.ui-gradient-border');
  await expect(border).toHaveAttribute('aria-hidden', 'true');
  await expect(border).toHaveCSS('mask-composite', /^exclude/);
  await expect(border).toHaveCSS('background-image', /linear-gradient/);
  await expect(border).toHaveCSS('pointer-events', 'none');
  const geometry = () => frame.evaluate((node) => {
    const parent = getComputedStyle(node);
    const layer = getComputedStyle(node.querySelector('.ui-gradient-border') ?? node);
    return { width: parseFloat(layer.paddingTop) / parseFloat(parent.paddingTop) * 24, sameRadius: layer.borderTopLeftRadius === parent.borderTopLeftRadius };
  });
  await expect.poll(async () => (await geometry()).width).toBeCloseTo(4, 3);
  expect((await geometry()).sameRadius).toBe(true);
  await expect(frame).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const button = page.getByTestId('gradient-button');
  await button.click();
  await button.focus();
  await expect(button).toBeFocused();
  await expect.poll(() => button.evaluate((node) => getComputedStyle(node, '::before').transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await geometry()).width).toBeCloseTo(8, 3);
  expect((await geometry()).sameRadius).toBe(true);
});

test('perspective caches pointer geometry and keeps frame variables local to its root', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const target = page.getByTestId('motion-grid');
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  await page.waitForTimeout(150);
  await target.evaluate((node) => {
    const original = node.getBoundingClientRect.bind(node);
    node.dataset.rectReads = '0';
    node.getBoundingClientRect = () => {
      node.dataset.rectReads = String(Number(node.dataset.rectReads ?? 0) + 1);
      return original();
    };
  });
  const box = await target.boundingBox();
  if (!box) throw new Error('Missing motion target');
  // boundingBox itself uses browser geometry, so count only the following real pointer moves.
  await target.evaluate((node) => { node.dataset.rectReads = '0'; });
  await page.mouse.move(box.x + 12, box.y + 8, { steps: 12 });
  await page.waitForTimeout(100);
  expect(Number(await target.getAttribute('data-rect-reads'))).toBeLessThanOrEqual(1);
  await expect.poll(() => target.evaluate((node) => Math.abs(parseFloat(node.style.getPropertyValue('--perspective3d-rotate-y'))))).toBeGreaterThan(0.1);
  await expect(target.locator('div')).toHaveCSS('--perspective3d-rotate-y', '0deg');
  await page.evaluate(() => window.scrollBy(0, 4));
  await page.waitForTimeout(80);
  await page.mouse.move(box.x + 24, box.y + 8);
  await expect.poll(async () => Number(await target.getAttribute('data-rect-reads'))).toBeGreaterThan(0);
});

test('parallax settles without feedback, skips offscreen geometry and resets on reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const target = page.getByTestId('parallax-target');
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 100));
  await expect.poll(() => target.evaluate((node) => Math.abs(parseFloat(node.style.getPropertyValue('--parallax-translate-y'))))).toBeGreaterThan(1);
  await page.waitForTimeout(1000);
  const settled = await target.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-translate-y')));
  await page.evaluate(() => { for (let i = 0; i < 10; i++) window.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(400);
  expect(await target.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-translate-y')))).toBeCloseTo(settled, 1);

  await target.evaluate((node) => {
    const original = node.getBoundingClientRect.bind(node);
    node.getBoundingClientRect = () => {
      node.dataset.rectReads = String(Number(node.dataset.rectReads ?? 0) + 1);
      return original();
    };
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await target.evaluate((node) => { node.dataset.rectReads = '0'; });
  await page.evaluate(() => { for (let i = 0; i < 10; i++) window.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(100);
  await expect(target).toHaveAttribute('data-rect-reads', '0');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => target.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-translate-y')))).toBe(0);
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 80));
  await expect.poll(() => target.evaluate((node) => parseFloat(node.style.getPropertyValue('--parallax-translate-y')))).toBe(0);
});

test('scroll parallax composes with reveal and tilt without frame writes, resets and cleans up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const target = page.getByTestId('parallax-scroll-target');
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute('data-reveal-state', 'done');
  await expect.poll(() => target.evaluate((el) => el.getAnimations().some((animation) => animation.timeline !== document.timeline))).toBe(true);
  const initial = await target.evaluate((el) => getComputedStyle(el).translate);
  await target.evaluate((node) => {
    const original = node.getBoundingClientRect.bind(node);
    node.dataset.rectReads = '0';
    node.getBoundingClientRect = () => { node.dataset.rectReads = String(Number(node.dataset.rectReads) + 1); return original(); };
  });
  await page.evaluate(() => window.scrollBy(0, 100));
  await expect.poll(() => target.evaluate((el) => getComputedStyle(el).translate)).not.toBe(initial);
  await expect(target).toHaveAttribute('data-rect-reads', '0');
  await expect(target).toHaveCSS('--parallax-translate-y', '0px');
  await page.mouse.move(1200, 100);
  await expect.poll(() => target.evaluate((el) => Math.abs(parseFloat(el.style.getPropertyValue('--perspective3d-rotate-y'))))).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => target.evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect(target).toHaveCSS('translate', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => target.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  const oldNode = await target.elementHandle();
  await page.getByTestId('toggle-scroll-parallax').click();
  await expect(target).toHaveCount(0);
  expect(await oldNode?.evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('scroll parallax falls back when ViewTimeline is unavailable', async ({ page }) => {
  await page.addInitScript(() => { Reflect.deleteProperty(window, 'ViewTimeline'); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const target = page.getByTestId('parallax-scroll-target');
  await target.scrollIntoViewIfNeeded();
  await expect.poll(() => target.evaluate((el) => Math.abs(parseFloat(el.style.getPropertyValue('--parallax-translate-y'))))).toBeGreaterThan(1);
});

test('idle glow pauses offscreen and in a hidden document, then resumes the same cycle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const button = page.getByTestId('idle-visibility');
  const state = () => button.evaluate((node) => getComputedStyle(node.querySelector('.ui-button-glow') ?? node, '::before').animationPlayState);
  await expect.poll(state).toBe('paused');
  await button.scrollIntoViewIfNeeded();
  await expect.poll(state).toBe('running');
  await page.waitForTimeout(150);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(state).toBe('paused');
  const paused = await button.evaluate((node) => node.getAnimations({ subtree: true })[0]?.currentTime);
  await page.waitForTimeout(150);
  expect(await button.evaluate((node) => node.getAnimations({ subtree: true })[0]?.currentTime)).toBe(paused);
  await button.scrollIntoViewIfNeeded();
  await expect.poll(state).toBe('running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(state).toBe('paused');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(state).toBe('running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => button.evaluate((node) => getComputedStyle(node.querySelector('.ui-button-glow') ?? node, '::before').animationName)).toBe('none');
});

test('shared box CSS switches background, coordinates and dynamic visibility without DOM prop leakage', async ({ page }) => {
  await openFixture(page);
  const box = page.getByTestId('responsive-box');
  const hidden = page.getByTestId('responsive-hidden');
  for (const { width, offset, token, visible } of [
    { width: 320, offset: 8, token: '--black', visible: true },
    { width: 768, offset: 16, token: '--background', visible: false },
    { width: 1440, offset: 24, token: '--primary', visible: false },
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const styles = await box.evaluate((node, token) => {
      const style = getComputedStyle(node);
      const host = node.parentElement;
      if (!host) throw new Error('Missing box host');
      const probe = document.createElement('span');
      probe.style.backgroundColor = `var(${token})`;
      probe.style.display = 'block';
      probe.style.width = 'calc(var(--rpx) * 100)';
      node.append(probe);
      const expectedColor = getComputedStyle(probe).backgroundColor;
      const rpx = probe.getBoundingClientRect().width / 100;
      probe.remove();
      const rect = node.getBoundingClientRect();
      const parent = host.getBoundingClientRect();
      return {
        position: style.position,
        color: style.backgroundColor,
        expectedColor,
        left: rect.left - parent.left,
        top: rect.top - parent.top,
        rpx,
        leaked: ['position', 'top', 'left', 'bg', 'hide'].filter((name) => node.hasAttribute(name)),
      };
    }, token);
    expect(styles.position).toBe('absolute');
    expect(styles.color).toBe(styles.expectedColor);
    expect(styles.left).toBeCloseTo(offset * styles.rpx, 1);
    expect(styles.top).toBeCloseTo(offset * styles.rpx, 1);
    expect(styles.leaked).toEqual([]);
    if (visible) await expect(hidden).toBeVisible();
    else await expect(hidden).toBeHidden();

    const icon = page.getByRole('link', { name: 'Positioned icon', exact: true });
    await expect(icon).toHaveCSS('position', 'absolute');
    expect(await icon.evaluate((node) => node.hasAttribute('position') || Boolean(node.querySelector('svg[position], svg[top], svg[right], svg[hide]')))).toBe(false);
  }
  await page.getByRole('button', { name: 'Toggle responsive box', exact: true }).click();
  await expect(hidden).toBeVisible();
});

test('Dropdown aligns the visible wide surface rather than a trigger-sized collapse wrapper', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page);
    for (const side of ['start', 'center', 'end', 'portal']) {
      const trigger = page.getByRole('button', { name: `Intrinsic ${side}`, exact: true });
      await trigger.click();
      const surface = page.getByTestId(`intrinsic-surface-${side}`);
      await expect(surface).toBeVisible();
      const rects = await trigger.evaluate((node, side) => {
        const id = node.getAttribute('aria-controls');
        const panel = id ? document.getElementById(id) : null;
        const surface = document.querySelector(`[data-testid="intrinsic-surface-${side}"]`);
        if (!panel || !surface) throw new Error('Missing dropdown surface');
        const rect = (element: Element) => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        };
        return { trigger: rect(node), panel: rect(panel), surface: rect(surface) };
      }, side);
      expect(Math.abs(rects.surface.width - rects.panel.width)).toBeLessThan(1);
      if (side === 'start') expect(Math.abs(rects.surface.left - rects.trigger.left)).toBeLessThan(1);
      if (side === 'end') expect(Math.abs(rects.surface.right - rects.trigger.right)).toBeLessThan(1);
      if (side === 'center') expect(Math.abs(rects.surface.left + rects.surface.right - rects.trigger.left - rects.trigger.right)).toBeLessThan(1);
      if (side === 'portal') {
        expect(rects.surface.left).toBeGreaterThanOrEqual(0);
        expect(rects.surface.right).toBeLessThanOrEqual(width);
      }
      await trigger.press('Escape');
      await expect(surface).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  }
});

test('unified inView animate observes one HTML host per primitive and never leaks configuration to DOM', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
  });
  await openFixture(page);
  await expect(page.getByTestId('legacy-icon-host').locator(':scope > svg')).toHaveCount(1);
  const cases = page.getByRole('region', { name: 'Unified viewport animation' }).locator('[data-inview-case]');
  await expect(cases).toHaveCount(18);
  for (const scope of await cases.all()) {
    const name = await scope.getAttribute('data-inview-case');
    const host = scope.locator('[data-reveal]');
    await expect(host, `${name}: single motion host`).toHaveCount(1);
    expect(await host.evaluate((node) => node instanceof HTMLElement), `${name}: observable HTML host`).toBe(true);
    await expect(host).toHaveAttribute('data-reveal', 'up');
    await expect(host).toHaveCSS('--reveal-delay', '20ms');
    await expect(host).toHaveCSS('--reveal-duration', '40ms');
    await host.evaluate((node) => node.scrollIntoView({ block: 'center' }));
    await expect(host, `${name}: enters viewport`).toHaveAttribute('data-reveal-state', /^(in|done)$/);
    await expect(scope.locator('[animate]')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('reveal skip marker dynamically releases an in-view child without stale observer state or delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Named motion timing' });
  await scope.evaluate((node) => (node as HTMLElement).style.setProperty('--t-d-fast', '0.1s'));
  const view = page.getByTestId('named-view');
  await view.scrollIntoViewIfNeeded();
  const children = view.locator(':scope > div');
  await expect(children.first()).toHaveAttribute('data-reveal-state', 'in');
  expect(await children.evaluateAll((nodes) => nodes.map((node) => ({
    delay: getComputedStyle(node).animationDelay,
    duration: getComputedStyle(node).animationDuration,
  })))).toEqual([
    { delay: '0.1s', duration: '0.8s' },
    { delay: '0.12s', duration: '0.8s' },
  ]);
  const loadChildren = page.getByTestId('named-load').locator(':scope > div');
  await expect(loadChildren).toHaveCount(4);
  await expect(page.getByTestId('named-load-first')).toHaveCSS('animation-delay', '0.1s');
  await expect(page.getByTestId('named-load-second')).toHaveCSS('animation-delay', '0.12s');
  await expect(page.getByTestId('named-load-decoration')).toHaveCSS('animation-name', 'none');
  await expect(page.getByTestId('named-load-owned')).toHaveCSS('animation-delay', '0.02s');
  await expect(children.first()).toHaveAttribute('data-reveal-state', 'done');
  await expect(children.nth(1)).toHaveAttribute('data-reveal-state', 'done');

  const decoration = page.getByTestId('named-inview-decoration');
  await decoration.scrollIntoViewIfNeeded();
  await expect(decoration).toHaveAttribute('data-reveal-state', /^(in|done)$/);
  expect(await decoration.evaluate((node) => node.style.getPropertyValue('--reveal-delay'))).not.toBe('');

  await page.getByTestId('toggle-reveal-skip').click();
  await expect(decoration).toHaveAttribute('data-reveal-skip', '');
  await expect(decoration).not.toHaveAttribute('data-reveal-state', /.+/);
  expect(await decoration.evaluate((node) => node.style.getPropertyValue('--reveal-delay'))).toBe('');

  await decoration.scrollIntoViewIfNeeded();
  await expect(decoration).not.toHaveAttribute('data-reveal-state', /.+/);
  await page.getByTestId('toggle-reveal-skip').click();
  await expect(decoration).not.toHaveAttribute('data-reveal-skip', /.+/);
  await expect(decoration).toHaveAttribute('data-reveal-state', /^(in|done)$/);
});

test('Img object change animate snapshots direction, waits for load, follows the latest source and cleans layers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let releaseRemote: (() => void) | undefined;
  const remoteReady = new Promise<void>((resolve) => { releaseRemote = resolve; });
  await page.route('**/motion-two.svg', async (route) => {
    await remoteReady;
    await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48"><rect width="80" height="48" fill="red"/></svg>' });
  });
  await openFixture(page);
  const image = page.getByTestId('change-img');
  const swap = image.locator('.ui-img-swap');
  await expect(swap).toHaveCount(1);
  await expect(swap.locator('img.ui-img-image')).toHaveAttribute('src', /data:image\/svg\+xml/);
  await expect.poll(() => swap.locator('img.ui-img-image').evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(swap.locator('.ui-img-swap-out')).toHaveCount(0);

  await page.getByTestId('img-change-remote').click();
  await expect(swap.locator('.ui-img-swap-pending')).toHaveCount(1);
  await swap.locator('.ui-img-swap-layer[aria-hidden="true"] img').dispatchEvent('load');
  await expect(swap.locator('.ui-img-swap-pending')).toHaveCount(1);
  await page.getByTestId('img-change-reverse').click();
  await expect.poll(() => swap.evaluate((node) => getComputedStyle(node).getPropertyValue('--img-swap-dir').trim())).toBe('1');
  await page.getByTestId('img-change-latest').click();
  releaseRemote?.();

  await expect(swap.locator('.ui-img-swap-veil')).toHaveCount(1);
  await expect(swap.locator('.ui-img-swap-veil')).toHaveCSS('animation-duration', '0.7s');
  await expect.poll(() => swap.evaluate((node) => getComputedStyle(node).getPropertyValue('--img-swap-dir').trim()), { timeout: 4000 }).toBe('-1');
  await expect.poll(() => image.locator('.ui-img-swap-layer:not(.ui-img-swap-out) img.ui-img-image').last().getAttribute('src'), { timeout: 4000 })
    .toBe('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48"%3E%3Crect width="80" height="48" fill="%2333a"/%3E%3C/svg%3E');
  await expect(swap.locator('.ui-img-swap-out, .ui-img-swap-veil')).toHaveCount(0, { timeout: 4000 });
});

test('Text object counter and textSlide keep timing, root semantics and reduced-motion behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Object text animation' });
  await expect(scope).toHaveCSS('--t-d-fast', '0.35s');

  const loadCounter = page.getByTestId('text-load-counter');
  const loadValue = loadCounter.locator('.ui-counter-value');
  await expect(loadValue).toHaveText('100');
  const start = Date.now();
  await page.getByTestId('counter-change-target').click();
  await expect(loadValue).toHaveText('200', { timeout: 1500 });
  expect(Date.now() - start).toBeGreaterThanOrEqual(250);

  const inViewCounter = page.getByTestId('text-inview-counter');
  const inViewValue = inViewCounter.locator('.ui-counter-value');
  await expect(inViewValue).toHaveText('0');
  const viewStart = Date.now();
  await inViewCounter.scrollIntoViewIfNeeded();
  await expect(inViewValue).toHaveText('50', { timeout: 1500 });
  expect(Date.now() - viewStart).toBeGreaterThanOrEqual(250);

  const slide = page.getByTestId('text-slide-object');
  await slide.evaluate((node) => { node.setAttribute('data-identity', 'stable-root'); });
  await page.getByTestId('text-slide-update').click();
  const swap = slide.locator('.ui-slide-swap');
  const outgoing = swap.locator('[data-swap-out]');
  await expect(outgoing).toHaveAttribute('aria-hidden', 'true');
  await expect(swap.locator('[data-swap-in]')).toHaveText('B');
  await expect(swap.locator('[data-swap-in]')).toHaveCSS('animation-duration', '0.35s');
  await expect(slide).toHaveAttribute('aria-label', 'Page title');
  await expect(slide).toHaveAttribute('data-identity', 'stable-root');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('counter-change-target').click();
  await expect(loadValue).toHaveText('300');
  await page.getByTestId('text-slide-update').click();
  await expect(slide.locator('.ui-slide-swap')).toContainText('Page A');
  await expect(slide.locator('[data-swap-out]')).toHaveCount(0);
  await expect(slide).toHaveAttribute('data-identity', 'stable-root');
});

test('modular Input actions preserve the native input, focus, value and associated feedback', async ({ page }) => {
  await openFixture(page);
  const field = page.getByTestId('modular-password');
  await expect(page.getByLabel('Modular password')).toBeVisible();
  await expect(field).toHaveAttribute('type', 'password');
  await expect(page.getByText('Исправьте значение', { exact: true })).toBeVisible();
  const errorId = await page.getByText('Исправьте значение', { exact: true }).getAttribute('id');
  expect(errorId).toBeTruthy();
  await expect(field).toHaveAttribute('aria-describedby', errorId ?? '');

  await field.fill('edited secret');
  await field.evaluate((node) => { node.dataset.nativeIdentity = 'same-input'; });
  await page.getByRole('button', { name: 'Показать пароль', exact: true }).click();
  await expect(field).toHaveAttribute('type', 'text');
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('edited secret');
  await expect(field).toHaveAttribute('data-native-identity', 'same-input');

  await field.press('Tab');
  const hide = page.getByRole('button', { name: 'Скрыть пароль', exact: true });
  await expect(hide).toBeFocused();
  await hide.press('Space');
  await expect(field).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Показать пароль', exact: true })).toBeFocused();
  await expect(field).toHaveAttribute('data-native-identity', 'same-input');
  expect(await page.getByTestId('modular-input-form').evaluate((form: HTMLFormElement) => new FormData(form).get('password'))).toBe('edited secret');

  await page.getByRole('button', { name: 'Clear modular error' }).click();
  await expect(page.getByText('Исправьте значение', { exact: true })).toBeHidden();
  const comment = page.getByText('Подсказка поля', { exact: true });
  await expect(comment).toBeVisible();
  await expect(field).toHaveAttribute('aria-describedby', await comment.getAttribute('id') ?? '');
  await expect(field).toHaveAttribute('data-native-identity', 'same-input');
});

test('object and legacy Accordion triggers keep keyboard behavior, ARIA and option precedence', async ({ page }) => {
  await openFixture(page);
  const object = page.getByRole('button', { name: 'Object trigger', exact: true });
  await expect(object).toHaveClass(/object-trigger/);
  await expect(object).toHaveClass(/legacy-trigger/);
  const dimensions = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.paddingTop = 'calc(var(--rpx) * 12)';
    probe.style.columnGap = 'calc(var(--rpx) * 16)';
    document.body.append(probe);
    const computed = getComputedStyle(probe);
    const values = { padding: computed.paddingTop, gap: computed.columnGap };
    probe.remove();
    return values;
  });
  await expect(object).toHaveCSS('padding-top', dimensions.padding);
  await expect(object).toHaveCSS('column-gap', dimensions.gap);
  await expect(object).toHaveAttribute('aria-expanded', 'false');
  await object.focus();
  await object.press('Enter');
  await expect(object).toBeFocused();
  await expect(object).toHaveAttribute('aria-expanded', 'true');
  const panelId = await object.getAttribute('aria-controls');
  await expect(page.getByText('Object panel', { exact: true })).toBeVisible();
  expect(await page.getByText('Object panel', { exact: true }).getAttribute('id')).toBe(panelId);

  await object.press('ArrowDown');
  const legacy = page.getByRole('button', { name: 'Legacy trigger', exact: true });
  await expect(legacy).toBeFocused();
  await legacy.press('Space');
  await expect(legacy).toHaveAttribute('aria-expanded', 'true');
  await expect(object).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Legacy panel', { exact: true })).toBeVisible();
});

test('Input and Textarea keep native events separate from normalized value changes', async ({ page }) => {
  await openFixture(page);

  const plain = page.getByTestId('plain-value');
  await plain.pressSequentially('ab');
  const plainLogs = await page.evaluate(() => window.__fieldLogs.plain);
  expect(plainLogs.at(-1)).toMatchObject({
    reason: 'input',
    value: 'ab',
    eventType: 'change',
    eventValue: 'ab',
    targetIsControl: true,
    trusted: true,
    pairedWithDomEvent: true,
  });

  const phone = page.getByTestId('phone-value');
  await phone.pressSequentially('9161234567');
  const phoneLogs = await page.evaluate(() => window.__fieldLogs.phone);
  expect(phoneLogs.at(-1)?.reason).toBe('input');
  expect(phoneLogs.at(-1)?.value).toContain('+7');
  expect(phoneLogs.at(-1)?.eventType).toBe('change');
  expect(phoneLogs.at(-1)?.targetIsControl).toBe(true);
  expect(phoneLogs.at(-1)?.trusted).toBe(true);
  expect(phoneLogs.at(-1)?.eventValue).not.toContain('+7');

  const internationalPhone = page.getByTestId('phone-field');
  await internationalPhone.pressSequentially('9161234567');
  await expect(internationalPhone).toHaveValue(/\+7/);
  expect(await page.evaluate(() => window.__phoneEvents.at(-1))).toMatchObject({ trusted: true });
  expect(await page.evaluate(() => window.__phoneEvents.at(-1)?.domValue)).toContain('+7');

  const textarea = page.getByTestId('textarea-value');
  await textarea.pressSequentially('real');
  const textareaLogs = await page.evaluate(() => window.__fieldLogs.textarea);
  expect(textareaLogs.at(-1)).toMatchObject({
    reason: 'input',
    value: 'real',
    eventType: 'change',
    targetIsControl: true,
    trusted: true,
    pairedWithDomEvent: true,
  });
});

test('PhoneField keeps picker aligned, focuses country search, preserves the native input, and submits the international value', async ({ page }) => {
  await openFixture(page);
  const phone = page.getByTestId('phone-field');
  const country = page.getByRole('region', { name: 'Field event contracts' }).getByRole('button', { name: /Country: Russia/ });
  await expect(page.getByText('Check this phone number')).toBeVisible();

  const phoneBox = await phone.boundingBox();
  const countryBox = await country.boundingBox();
  expect(phoneBox).not.toBeNull();
  expect(countryBox).not.toBeNull();
  if (phoneBox && countryBox) {
    expect(Math.abs((phoneBox.y + phoneBox.height / 2) - (countryBox.y + countryBox.height / 2))).toBeLessThan(4);
  }

  await country.click();
  const search = page.getByRole('textbox', { name: 'Search countries' });
  await search.click();
  await search.fill('United States');
  await expect(search).toBeFocused();
  await page.getByRole('button', { name: /United States \(US\)/ }).click();
  await expect(page.getByRole('button', { name: /Country: United States/ })).toBeVisible();

  await phone.fill('4155552671');
  await expect(phone).toHaveValue(/\+1/);
  const nativeEvent = await page.evaluate(() => window.__phoneEvents.at(-1));
  expect(nativeEvent).toMatchObject({ trusted: true });
  expect(nativeEvent?.domValue).toBe('4155552671');
  const formValues = await page.getByTestId('phone-form').evaluate((form: HTMLFormElement) => [...new FormData(form).entries()]);
  expect(formValues).toEqual([['international', await phone.inputValue()]]);
  expect(await page.evaluate(() => window.__phoneValues.at(-1))).toMatch(/^\+1/);

  const before = await phone.evaluate((input: HTMLInputElement) => {
    const cursor = input.value.indexOf('555') + 1;
    input.setSelectionRange(cursor, cursor);
    return input.value.slice(0, cursor).replace(/\D/g, '').length;
  });
  await phone.press('9');
  await expect.poll(() => phone.evaluate((input: HTMLInputElement) => (
    input.value.slice(0, input.selectionStart ?? 0).replace(/\D/g, '').length
  ))).toBe(before + 1);

  await phone.fill('4155552671');
  await expect(phone).toHaveValue(/\+1 415 555 2671/);
  const usTrigger = page.getByRole('button', { name: /Country: United States/ });
  await usTrigger.click();
  const searchAgain = page.getByRole('textbox', { name: 'Search countries' });
  await searchAgain.fill('Canada');
  await page.getByRole('button', { name: /Canada \(CA\)/ }).click();
  await expect(phone).toHaveValue(/\+1/);
  await expect(page.getByRole('button', { name: /Country: Canada \(CA\)/ })).toBeVisible();
  const afterSameCallingCodeForm = await page.getByTestId('phone-form').evaluate((form: HTMLFormElement) => new FormData(form).get('international'));
  expect(afterSameCallingCodeForm).toBe(await phone.inputValue());

  await phone.fill('4155552672');
  await phone.fill('4155552671');
  await expect(page.getByRole('button', { name: /Country: United States \(US\)/ })).toBeVisible();
  expect(await page.evaluate(() => window.__phoneEvents.at(-1)?.trusted)).toBe(true);
});

test('all-country PhoneField typing exposes render cost and current picker mount count', async ({ page }) => {
  await openFixture(page);
  const phone = page.getByRole('textbox', { name: 'Profile phone field' });
  await page.getByRole('button', { name: /Страна: Россия/ }).last().click();
  const picker = page.getByRole('dialog', { name: 'Выберите страну' });
  await expect(picker).toBeVisible();
  const visibleOptionCount = await picker.locator('[aria-label="Страны"] button').count();
  expect(visibleOptionCount).toBeGreaterThan(200);
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect.poll(() => page.locator('[aria-label="Страны"] button').count()).toBe(0);
  const countBefore = await page.evaluate(() => window.__phoneCountryOptionCount);
  expect(countBefore).toBe(0);
  // Буфер ограничен 20 записями: новая выборка не измеряется ростом уже заполненного буфера.
  await page.evaluate(() => { window.__phoneProfileSamples = []; });
  await phone.pressSequentially('4155552671');
  await expect(phone).toHaveValue(/\+7/);
  await expect.poll(() => page.evaluate(() => window.__phoneProfileSamples.length)).toBeGreaterThanOrEqual(10);
  const samples = await page.evaluate(() => window.__phoneProfileSamples.slice(-10));
  expect(samples).toHaveLength(10);
  expect(await page.evaluate(() => window.__phoneCountryOptionCount)).toBe(countBefore);
  const summary = [...samples].sort((a, b) => a - b);
  console.log('all-country PhoneField input commits', {
    count: summary.length,
    medianMs: (summary[4] + summary[5]) / 2,
    maxMs: summary.at(-1),
    countryButtonsMountedWhileClosed: countBefore,
    countryButtonsMountedWhenOpen: visibleOptionCount,
  });
});

test('all-country PhoneField picker stays in the viewport and scrolls to selectable countries', async ({ page }) => {
  await openFixture(page);

  for (const viewport of [{ width: 320, height: 480 }, { width: 740, height: 380 }]) {
    await page.setViewportSize(viewport);
    const trigger = page.getByRole('button', { name: /Country:|Страна:/ }).last();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const picker = page.locator('[role="dialog"]').last();
    await expect(picker).toBeVisible();
    const panelBounds = await picker.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });
    expect(panelBounds.left).toBeGreaterThanOrEqual(0);
    expect(panelBounds.top).toBeGreaterThanOrEqual(0);
    expect(panelBounds.right).toBeLessThanOrEqual(viewport.width);
    expect(panelBounds.bottom).toBeLessThanOrEqual(viewport.height);

    const search = page.getByRole('textbox', { name: /Search countries|Поиск стран/ }).last();
    const results = picker.locator('[class*="countryResults"]');
    await search.fill('CA');
    await expect(results.getByRole('button', { name: /\(CA\)/ })).toBeVisible();
    await search.fill('');
    const firstOption = results.getByRole('button').first();
    await search.focus();
    await search.press('Tab');
    await expect(firstOption).toBeFocused();
    const focusOutline = await firstOption.evaluate((button) => getComputedStyle(button).outlineStyle);
    expect(focusOutline).not.toBe('none');

    const zimbabwe = results.getByRole('button', { name: /\(ZW\)/ });
    const getScrollMetrics = () => zimbabwe.evaluate((node) => {
      const item = node.getBoundingClientRect();
      const container = node.closest<HTMLElement>('[class*="countryResults"]');
      const viewportRect = container?.getBoundingClientRect();
      return {
        inView: Boolean(viewportRect && item.bottom > viewportRect.top && item.top < viewportRect.bottom),
        scrollTop: container?.scrollTop ?? 0,
        scrollHeight: container?.scrollHeight ?? 0,
        clientHeight: container?.clientHeight ?? 0,
        centerDelta: viewportRect ? (item.top + item.bottom - viewportRect.top - viewportRect.bottom) / 2 : 0,
      };
    });
    let metrics = await getScrollMetrics();
    while (!metrics.inView && metrics.scrollHeight > metrics.clientHeight && metrics.centerDelta !== 0) {
      await results.hover();
      await page.mouse.wheel(0, Math.round(metrics.centerDelta));
      const priorScrollTop = metrics.scrollTop;
      await expect.poll(() => getScrollMetrics().then((next) => next.scrollTop)).not.toBe(priorScrollTop);
      metrics = await getScrollMetrics();
    }
    expect(metrics.inView, JSON.stringify(metrics)).toBe(true);
    await zimbabwe.click();
    await expect(page.getByRole('button', { name: /\(ZW\)/ }).last()).toBeVisible();
    await expect(picker).toBeHidden();
  }
});

test('seed focus and blur use real focus events while the DOM value follows the hint', async ({ page }) => {
  await openFixture(page);
  const seed = page.getByTestId('seed-value');

  await expect(seed).toHaveValue('');
  await seed.focus();
  await expect(seed).toHaveValue('');
  expect(await page.evaluate(() => window.__focusLogs['seed-focus'])).toEqual({ type: 'focus', targetIsControl: true, trusted: true });
  await expect.poll(async () => (await page.evaluate(() => window.__fieldLogs.seed)).at(-1)).toMatchObject({
    reason: 'seed',
    value: '',
    eventType: 'focus',
    targetIsControl: true,
  });

  await seed.press('Tab');
  await expect(seed).toHaveValue('');
  await expect(seed).toHaveAttribute('placeholder', '0');
  const blurLog = await page.evaluate(() => window.__fieldLogs.seed.at(-1));
  expect(blurLog).toMatchObject({ reason: 'seed', value: '0', eventType: 'blur', targetIsControl: true });
  expect(blurLog?.trusted).toBe(true);
  expect(await page.evaluate(() => window.__focusLogs['seed-blur'])).toEqual({ type: 'blur', targetIsControl: true, trusted: true });
});

test('FormData preserves repeated names, disabled omission, and controls associated by form', async ({ page }) => {
  await openFixture(page);

  const formData = async () => page.getByTestId('external-form').evaluate((form: HTMLFormElement) => [...new FormData(form).entries()]);
  expect(await formData()).toEqual([
    ['shared', 'first'],
    ['reset', 'initial'],
    ['cancel', 'initial'],
    ['shared', 'alpha'],
    ['topic', 'one'],
  ]);

  await page.getByRole('button', { name: 'External multi select' }).click();
  await page.getByRole('option', { name: 'Beta' }).click();
  await page.getByRole('button', { name: 'Two' }).click();

  expect(await formData()).toEqual([
    ['shared', 'first'],
    ['reset', 'initial'],
    ['cancel', 'initial'],
    ['shared', 'alpha'],
    ['shared', 'beta'],
    ['topic', 'two'],
  ]);

  expect(await page.getByTestId('external-form').evaluate((form: HTMLFormElement) => (
    [...document.querySelectorAll<HTMLInputElement>('[form="external-form"]')].every((control) => control.form === form)
  ))).toBe(true);

  const reset = page.getByTestId('reset-field');
  await reset.fill('changed');
  const changesBeforeReset = await page.evaluate(() => window.__resetValueChanges);
  await page.getByRole('button', { name: 'Reset external fields' }).click();
  await expect(reset).toHaveValue('initial');
  await expect.poll(() => page.evaluate(() => window.__resetValueChanges)).toBe(changesBeforeReset);

  const canceled = page.getByTestId('cancel-reset-field');
  await canceled.fill('keep me');
  await page.getByRole('button', { name: 'Toggle reset cancellation' }).click();
  await page.getByRole('button', { name: 'Reset external fields' }).click();
  await expect(canceled).toHaveValue('keep me');
});

test('number stepping honors min-relative fractional steps and ignores any or read-only controls', async ({ page }) => {
  await openFixture(page);

  const fraction = page.getByTestId('fraction-step');
  await fraction.locator('xpath=../../..').locator('[data-input-action]').first().click();
  await expect(fraction).toHaveValue('0.7');
  await fraction.locator('xpath=../../..').locator('[data-input-action]').last().click();
  await expect(fraction).toHaveValue('0.2');
  expect(await page.evaluate(() => window.__numberChanges)).toBe(2);

  const any = page.getByTestId('any-step');
  await expect(any.locator('xpath=../../..').locator('[data-input-action]')).toHaveCount(0);
  await expect(any).toHaveValue('1.25');

  const readOnly = page.getByTestId('readonly-step');
  await expect(readOnly.locator('xpath=../../..').locator('[data-input-action]')).toHaveCount(0);
  await expect(readOnly).toHaveValue('2');
  expect(await page.evaluate(() => window.__numberChanges)).toBe(2);
});

test('collapse hides focusable content with inert, then reopens and reports refs and transition callbacks', async ({ page }) => {
  await page.addInitScript(() => { delete HTMLElement.prototype.onbeforematch; });
  await openFixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const wrap = page.getByRole('region', { name: 'Collapse contracts' }).locator('.ui-collapse');
  const inside = page.getByTestId('inside-collapse');
  await expect(wrap).toHaveAttribute('inert', '');
  await expect(wrap).toHaveAttribute('hidden', '');

  await page.getByRole('button', { name: 'Open details' }).click();
  await expect(inside).toBeVisible();
  await expect(wrap).toHaveAttribute('data-settled', 'true');
  await page.getByRole('button', { name: 'Read collapse refs' }).click();
  const state = JSON.parse((await page.getByTestId('collapse-state').textContent()) ?? '{}');
  expect(state).toMatchObject({ node: true, handle: true, transitions: 1, ends: 1 });

  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(wrap).toHaveAttribute('inert', '');
  await expect(wrap).toHaveAttribute('hidden', '');
  await page.getByRole('button', { name: 'Open details' }).click();
  await expect(inside).toBeVisible();
  await expect(wrap).toHaveAttribute('data-settled', 'true');
});

test('keepMounted Flex search reveal opens before found content can receive focus', async ({ page }) => {
  await openFixture(page);
  const input = page.getByTestId('searchable-flex-input');
  const wrap = page.getByTestId('searchable-flex').locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," ui-collapse ")]');

  await expect(wrap).toHaveAttribute('hidden', 'until-found');
  await expect(wrap).not.toHaveAttribute('inert', '');
  await input.focus();
  await expect(input).not.toBeFocused();

  await wrap.evaluate((node) => node.dispatchEvent(new Event('beforematch')));
  await expect.poll(() => page.getByTestId('search-found-count').textContent()).toBe('1');
  await expect(wrap).not.toHaveAttribute('hidden');
  await input.focus();
  await expect(input).toBeFocused();
});

test('Button tooltip keeps its anchor node, ref, keyboard focus, and click callback', async ({ page }) => {
  await openFixture(page);
  const button = page.getByTestId('tooltip-button');
  await button.focus();
  await expect(page.getByRole('tooltip')).toHaveText('Tooltip one');
  await expect(button).toBeFocused();

  await button.click();
  await expect(page.getByRole('tooltip')).toHaveText('Tooltip two');
  await expect(button).toBeFocused();
  await page.getByRole('button', { name: 'Read button ref' }).click();
  await expect(page.getByTestId('button-ref')).toHaveText('true');
});

test('disabled Button links cannot activate external or internal destinations', async ({ page }) => {
  await openFixture(page);
  const internal = page.getByTestId('disabled-internal-link');
  const external = page.getByTestId('disabled-external-link');
  await expect(internal).toHaveAttribute('aria-disabled', 'true');
  await expect(external).toHaveAttribute('aria-disabled', 'true');
  await expect(internal).toHaveAttribute('tabindex', '-1');
  await expect(external).toHaveAttribute('tabindex', '-1');
  await expect(internal).toHaveAttribute('href', '/local-destination');
  await expect(external).not.toHaveAttribute('href', 'https://example.test/external-destination');
  await internal.click({ force: true });
  await external.click({ force: true });
  await expect(page).toHaveURL(/4178\/$/);
  expect(await page.evaluate(() => window.__disabledLinkClicks)).toBe(0);
});

test('Icon tooltip keeps the link and inline SVG stable while merging accessible descriptions', async ({ page }) => {
  await openFixture(page);
  const link = page.getByRole('link', { name: 'Help link' });
  const svg = link.getByTestId('tooltip-icon-svg');
  await expect(link).toHaveAttribute('href', 'https://example.test/icon-help');

  const initialDescription = (await link.getAttribute('aria-describedby'))?.split(/\s+/) ?? [];
  expect(initialDescription).toContain('consumer-description');

  await link.focus();
  await expect(link).toBeFocused();
  await expect(page.getByRole('tooltip')).toHaveText('Help');
  const tooltipId = await page.getByRole('tooltip').getAttribute('id');
  expect(tooltipId).toBeTruthy();
  expect(initialDescription).toContain(tooltipId);
  expect(await page.evaluate(() => window.__iconEvents)).toEqual([
    { type: 'focus', currentTarget: 'A', trusted: true },
  ]);
  expect(await svg.evaluate((node) => window.__iconSvg === node)).toBe(true);
  await svg.evaluate((node) => { node.dataset.nativeIdentity = 'same-svg'; });

  await page.evaluate(() => window.__setIconTooltip?.('Updated help'));
  await expect(page.getByRole('tooltip')).toHaveText('Updated help');
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute('aria-describedby', `consumer-description ${tooltipId}`);
  expect(await page.getByRole('tooltip').getAttribute('id')).toBe(tooltipId);

  await page.evaluate(() => window.__setIconTooltip?.(''));
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(link).toHaveAttribute('aria-describedby', 'consumer-description');
  await expect(link).toBeFocused();

  await page.evaluate(() => window.__setIconTooltip?.('Restored help'));
  await expect(page.getByRole('tooltip')).toHaveText('Restored help');
  await expect(link).toHaveAttribute('aria-describedby', `consumer-description ${tooltipId}`);
  await expect(link).toBeFocused();

  await expect(svg).toHaveAttribute('data-native-identity', 'same-svg');
  expect(await svg.evaluate((node) => window.__iconSvg === node)).toBe(true);
  expect(await link.evaluate((node) => node === document.querySelector('.ui-icon-link'))).toBe(true);
  await link.evaluate((node) => (node as HTMLAnchorElement).blur());
  expect(await page.evaluate(() => window.__iconEvents)).toEqual([
    { type: 'focus', currentTarget: 'A', trusted: true },
    { type: 'blur', currentTarget: 'A', trusted: true },
  ]);
});

test('Media type choices are keyboard-operable buttons with pressed state', async ({ page }) => {
  await openFixture(page);
  const widget = page.locator('.fixture-media-dropdown');
  await widget.locator('[class*="Trigger"]').first().click();

  const video = page.getByRole('button', { name: 'Видео' });
  await video.focus();
  await expect(video).toHaveAttribute('aria-pressed', 'false');
  await video.press('Enter');

  await expect(page.getByTestId('media-type')).toHaveText('video');
  await expect(video).toHaveAttribute('aria-pressed', 'true');
});

test('MediaDropDown closes and stays inert after becoming disabled while open', async ({ page }) => {
  await openFixture(page);
  const widget = page.locator('.fixture-media-dropdown');
  const trigger = widget.locator('[class*="Trigger"]').first();
  await trigger.click();
  const panel = widget.locator('[class*="DropdownWrapper"]');
  await expect(panel).toBeVisible();
  await page.evaluate(() => window.__setMediaDisabled?.(true));
  await expect(widget).toHaveAttribute('data-open', 'false');
  await expect(panel).toHaveAttribute('inert', '');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(panel).toBeHidden();
  await trigger.click({ force: true });
  await expect(widget).toHaveAttribute('data-open', 'false');
  expect(await page.getByTestId('media-type').textContent()).toBe('image');
});

test('CarouselNav supports keyboard activation and disabled endpoints', async ({ page }) => {
  await openFixture(page);
  const nav = page.locator('.fixture-carousel-nav');
  const previous = nav.getByRole('button', { name: 'Предыдущий слайд' });
  const next = nav.getByRole('button', { name: 'Следующий слайд' });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await next.focus();
  await next.press('Enter');
  await expect(page.locator('[data-carousel-id="nav-fixture"] .swiper-slide-active')).toContainText('Navigation slide two');
  await expect(previous).toBeEnabled();
  await next.press('Space');
  await expect(page.locator('[data-carousel-id="nav-fixture"] .swiper-slide-active')).toContainText('Navigation slide three');
  await expect(next).toBeDisabled();
  await previous.focus();
  await previous.press('Enter');
  await expect(page.locator('[data-carousel-id="nav-fixture"] .swiper-slide-active')).toContainText('Navigation slide two');
});

test('Box and Flex swap content through real exit and enter animation completion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const box = page.getByTestId('swap-box');
  const flex = page.getByTestId('swap-flex');
  await expect(box).toHaveText('Box first');
  await expect(flex).toHaveText('Flex first');

  // Initial entry can finish before the first action on a busy worker. Start the swap observation afterwards.
  await expect.poll(() => page.evaluate(() => window.__swapEvents)).toMatchObject({
    box: [{ name: 'ui-flex-fadeInUp' }],
    flex: [{ name: 'ui-flex-fadeInUp' }],
  });
  await page.evaluate(() => {
    window.__swapEvents = { box: [], flex: [] };
    window.__swapStarts = { box: [], flex: [] };
  });

  await page.evaluate(() => window.__setSwapKey?.('second'));
  await expect(box).toHaveText('Box second');
  await expect(flex).toHaveText('Flex second');
  await expect(box).toHaveClass(/ui-anim-fadeInUp/);
  await expect(flex).toHaveClass(/ui-anim-fadeInUp/);

  expect(await page.evaluate(() => window.__swapNodes.box === document.querySelector('[data-testid="swap-box"]'))).toBe(true);
  expect(await page.evaluate(() => window.__swapNodes.flex === document.querySelector('[data-testid="swap-flex"]'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__swapEvents)).toMatchObject({
    box: [{ name: 'ui-flex-fadeOutDown' }, { name: 'ui-flex-fadeInUp' }],
    flex: [{ name: 'ui-flex-fadeOutDown' }, { name: 'ui-flex-fadeInUp' }],
  });
  await expect.poll(() => page.evaluate(() => window.__swapStarts)).toMatchObject({
    box: [
      { name: 'ui-flex-fadeOutDown', text: 'Box first' },
      { name: 'ui-flex-fadeInUp', text: 'Box second' },
    ],
    flex: [
      { name: 'ui-flex-fadeOutDown', text: 'Flex first' },
      { name: 'ui-flex-fadeInUp', text: 'Flex second' },
    ],
  });
});

test('LexicalText mounted from empty content attaches reveal observation and settles when scrolled into view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  await expect(page.getByTestId('lexical-reveal')).toHaveCount(0);

  await page.evaluate(() => window.__setLexicalText?.('<p>Revealed lexical content</p>'));
  const lexical = page.getByTestId('lexical-reveal');
  await expect(lexical).toHaveAttribute('data-reveal-state', 'wait');
  await lexical.scrollIntoViewIfNeeded();
  await expect(lexical).toHaveAttribute('data-reveal-state', 'done');
  await expect(lexical).toContainText('Revealed lexical content');
});

test('Dropdown keeps controlled state with its owner and honors cancellation, disabled and defaultOpen', async ({ page }) => {
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Dropdown state contracts' });
  const trigger = scope.getByRole('button', { name: 'Controlled dropdown', exact: true });
  const requests = scope.getByTestId('dropdown-requests');
  await scope.getByRole('button', { name: 'Mount initially open dropdown' }).click();
  const initial = scope.getByRole('button', { name: 'Initially open dropdown', exact: true });
  await expect(initial).toHaveAttribute('aria-expanded', 'true');
  await scope.getByRole('button', { name: 'Initial dropdown action' }).press('Escape');
  await expect(initial).toHaveAttribute('aria-expanded', 'false');
  await expect(initial).toBeFocused();

  await trigger.click();
  await expect(requests).toHaveText('[true]');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await scope.getByRole('button', { name: 'Toggle dropdown approval' }).click();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const action = page.getByRole('button', { name: 'Controlled dropdown action' });
  await expect(action).toBeVisible();
  const panelId = await trigger.getAttribute('aria-controls');
  const panel = page.locator(`[id="${panelId}"]`);
  expect(await panel.evaluate((node) => node.getBoundingClientRect().width)).toBeCloseTo(await trigger.evaluate((node) => node.getBoundingClientRect().width), 0);
  await action.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(requests).toHaveText('[true,true,false]');

  await scope.getByRole('button', { name: 'Toggle dropdown cancellation' }).click();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(requests).toHaveText('[true,true,false]');
  await scope.getByRole('button', { name: 'Toggle dropdown cancellation' }).click();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // Change disabled while focus stays inside the panel; outside dismissal must not be the cause.
  await scope.getByRole('button', { name: 'Toggle dropdown disabled' }).dispatchEvent('click');
  await expect(trigger).toBeDisabled();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(action).toBeHidden();
  await expect(requests).toHaveText('[true,true,false,true,false]');
  await scope.getByRole('button', { name: 'Toggle dropdown disabled' }).click();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // Root collapse hides the portalled panel too; preserve focus to exclude outside dismissal.
  await scope.getByRole('button', { name: 'Toggle whole dropdown' }).dispatchEvent('click');
  await expect(action).toBeHidden();
  await expect(panel).toBeHidden();
  await expect(requests).toHaveText('[true,true,false,true,false,true,false]');
  await expect(trigger).toBeHidden();
  await scope.getByRole('button', { name: 'Toggle whole dropdown' }).click();
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(action).toBeVisible();
  expect(await panel.evaluate((node) => node.getBoundingClientRect().width)).toBeCloseTo(await trigger.evaluate((node) => node.getBoundingClientRect().width), 0);
  await action.press('Escape');
  await expect(trigger).toBeFocused();
});

test('Select preserves panel styling, grouped options and opening guards through Dropdown', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Select panel contracts' });
  for (const variant of ['primary', 'primaryFill', 'secondary']) {
    const trigger = scope.getByRole('button', { name: `Panel ${variant}`, exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const list = page.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`);
    await expect(list.getByText('Panel group', { exact: true })).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(2);
    const surface = list.locator('..');
    await expect(surface).toHaveCSS('border-bottom-left-radius', '24px');
    await expect(surface).toHaveCSS('border-top-left-radius', '6px');
    const sizes = await trigger.evaluate((node) => {
      const list = document.getElementById(node.getAttribute('aria-controls') ?? '');
      return { trigger: node.getBoundingClientRect().width, surface: list?.parentElement?.getBoundingClientRect().width };
    });
    expect(sizes.surface).toBeDefined();
    expect(Math.abs((sizes.surface ?? 0) - sizes.trigger)).toBeLessThan(1);
    await list.getByRole('option', { name: 'Panel option two', exact: true }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveText('Выбрано (1)');
  }
  for (const name of ['Empty panel', 'Loading panel']) {
    const trigger = scope.getByRole('button', { name, exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
  const disabled = scope.getByRole('button', { name: 'Disabled panel', exact: true });
  await disabled.dispatchEvent('click');
  await expect(disabled).toHaveAttribute('aria-expanded', 'false');
  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
});

test('nested Dropdown consumes the first Escape inside a scrolling Modal', async ({ page }) => {
  await openFixture(page);
  const opener = page.getByRole('button', { name: 'Open scroll modal' });
  await opener.click();

  const dialog = page.getByRole('dialog', { name: 'Browser regression modal' });
  await expect(dialog).toBeVisible();
  const menuTrigger = page.getByTestId('nested-dropdown-trigger');
  await menuTrigger.scrollIntoViewIfNeeded();
  await expect.poll(() => dialog.locator(':scope > div').evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await menuTrigger.click();
  await expect(menuTrigger).toHaveAttribute('aria-expanded', 'true');
  const panelId = await menuTrigger.getAttribute('aria-controls');
  const portalPanel = page.locator(`#${panelId}`);
  await expect(portalPanel).toBeVisible();
  await expect(portalPanel).toHaveAttribute('data-side', 'end');
  expect(await portalPanel.evaluate((node) => !node.closest('[role="dialog"]'))).toBe(true);
  const alignment = await portalPanel.evaluate((node) => {
    const triggerBox = document.querySelector<HTMLElement>('[data-testid="nested-dropdown-trigger"]')!.getBoundingClientRect();
    const panelBox = node.getBoundingClientRect();
    return Math.abs(triggerBox.right - panelBox.right);
  });
  expect(alignment).toBeLessThan(2);
  const action = page.getByTestId('nested-dropdown-action');
  await menuTrigger.focus();
  await menuTrigger.press('Tab');
  await expect(action).toBeFocused();
  await action.press('Shift+Tab');
  await expect(menuTrigger).toBeFocused();
  await action.press('Escape');

  await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');
  await expect(menuTrigger).toBeFocused();
  await expect(dialog).toBeVisible();

  await menuTrigger.click();
  await expect(portalPanel).toBeVisible();
  await page.getByText('Long modal content').click({ force: true });
  await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog).toBeVisible();

  await menuTrigger.click();
  await expect(portalPanel).toBeVisible();
  await page.getByTestId('nested-dropdown-action').press('Escape');
  await expect(menuTrigger).toHaveAttribute('aria-expanded', 'false');

  await menuTrigger.press('Escape');
  await expect(page.locator('[aria-label="Browser regression modal"]').locator('xpath=ancestor::*[@aria-hidden="true"]')).toHaveCount(1);
  await expect(opener).toBeFocused();
});

test('Select portal escapes the scroll-clipped Modal, keeps focus trapped, and closes in layers', async ({ page }) => {
  await openFixture(page);
  const opener = page.getByRole('button', { name: 'Open portal select modal' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Portal select modal' });
  await expect(dialog).toBeVisible();
  const select = page.getByRole('button', { name: 'Select inside modal' });
  await select.scrollIntoViewIfNeeded();
  await expect.poll(() => dialog.locator(':scope > div').evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await select.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  const listbox = page.getByRole('listbox');
  expect(await listbox.evaluate((node) => !node.closest('[role="dialog"]'))).toBe(true);
  await select.press('Home');
  await select.press('ArrowDown');
  await expect(listbox).toHaveAttribute('aria-activedescendant', /option-1$/);
  await select.press('Enter');
  await expect.poll(() => page.getByTestId('modal-select-form').evaluate((form: HTMLFormElement) => new FormData(form).get('modalChoice'))).toBe('second');

  await select.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByText('Scroll before the select').click({ force: true });
  await expect(page.getByRole('listbox')).toHaveCount(0);

  await select.focus();
  await select.press('Shift+Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  await select.focus();
  await select.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await select.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await select.press('Escape');
  // Reduced motion can complete before another protocol call observes the inactive DOM phase.
  await expect(page.locator('[role="dialog"][aria-label="Portal select modal"]')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  await expect(opener).toBeFocused();
});

test('declarative Modal composes the trigger, respects its controlled owner, updates content, and shares the imperative stack', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openFixture(page);
  const trigger = page.getByRole('button', { name: 'Open controlled declaration', exact: true });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const dialog = page.locator('[role="dialog"][aria-label="Controlled declaration"]');
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-controls', await dialog.getAttribute('id') ?? '');
  await expect(page.getByTestId('declarative-modal-log')).toHaveText('{"clicks":1,"changes":[true]}');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Request declaration close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('declarative-modal-log')).toHaveText('{"clicks":1,"changes":[true,false]}');
  for (let value = 1; value <= 5; value += 1) {
    await dialog.getByRole('button', { name: 'Update declaration content' }).click();
    await expect(page.getByTestId('declaration-content')).toHaveText(`Current content ${value}`);
  }
  await dialog.getByRole('button', { name: 'Verify declaration ref' }).click();
  await expect(dialog.locator('..')).toHaveAttribute('data-ref-verified', 'true');
  const inner = dialog.locator(':scope > div');
  expect(await inner.evaluate((node) => {
    const measure = document.createElement('div');
    measure.style.width = 'calc(16 * var(--rpx))';
    node.append(measure);
    const expected = measure.getBoundingClientRect().width;
    measure.remove();
    return { actual: Number.parseFloat(getComputedStyle(node).paddingRight), expected };
  }).then(({ actual, expected }) => Math.abs(actual - expected))).toBeLessThan(1);

  await dialog.getByTestId('open-top-modal').click();
  const top = page.getByRole('dialog', { name: 'Top stacked modal', exact: true });
  await expect(top).toBeVisible();
  await expect(dialog.locator('..')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(dialog.getByTestId('open-top-modal')).toBeFocused();
  await expect(dialog.locator('..')).not.toHaveAttribute('inert', '');
  await expect(page.locator('[role="dialog"][aria-label="Top stacked modal"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Allow declaration close' }).click();
  await dialog.getByRole('button', { name: 'Request declaration close' }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(page.locator('[role="dialog"][aria-label="Controlled declaration"]')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  expect(errors).toEqual([]);
});

test('declarative Modal cancellation, disabled trigger, defaultOpen and rapid reopen use one stack entry', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Cancelled declaration', exact: true }).click();
  await expect(page.locator('[role="dialog"][aria-label="Cancelled declaration dialog"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Disabled declaration', exact: true })).toBeDisabled();
  await expect(page.locator('[role="dialog"][aria-label="Disabled declaration dialog"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mount default declaration' }).click();
  const defaultDialog = page.getByRole('dialog', { name: 'Default declaration', exact: true });
  await expect(defaultDialog).toBeVisible();
  await defaultDialog.getByRole('button', { name: 'Close default declaration' }).click();
  await expect(page.getByRole('button', { name: 'Mount default declaration' })).toBeFocused();
  await expect(page.locator('[role="dialog"][aria-label="Default declaration"]')).toHaveCount(0);

  const trigger = page.getByRole('button', { name: 'Open controlled declaration', exact: true });
  await trigger.click();
  const dialog = page.locator('[role="dialog"][aria-label="Controlled declaration"]');
  const id = await dialog.getAttribute('id');
  await dialog.getByRole('button', { name: 'Allow declaration close' }).click();
  await dialog.getByRole('button', { name: 'Request declaration close' }).click();
  await trigger.click();
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toHaveAttribute('id', id ?? '');
  await expect(dialog.locator('..')).toHaveAttribute('data-open', 'true');
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await dialog.getByRole('button', { name: 'Request declaration close' }).click();
  await expect(dialog).toHaveCount(0);
});

test('declarative Modal uses shared full distance open motion, one inner scroll owner and desktop dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  await page.evaluate(() => document.documentElement.style.setProperty('--t-m-distance-full', '100%'));
  const trigger = page.getByRole('button', { name: 'Open mobile declaration', exact: true });
  await trigger.click();
  const dialog = page.locator('[role="dialog"][aria-label="Mobile declaration"]');
  await expect(dialog).toHaveAttribute('data-reveal', 'down');
  await expect(dialog).toHaveAttribute('data-reveal-state', 'in');
  await expect(dialog).toHaveCSS('--reveal-distance', '100%');
  await expect(dialog).toHaveCSS('overflow-y', 'hidden');
  const inner = dialog.locator(':scope > div');
  await expect(inner).toHaveCSS('overflow-y', 'auto');
  await expect(inner).toHaveCSS('padding-right', '0px');
  const pageY = await page.evaluate(() => window.scrollY);
  await expect.poll(() => dialog.evaluate((node) => getComputedStyle(node).translate)).toMatch(/^0px(?: 0(?:px|%))?$/);
  await inner.hover();
  await page.mouse.wheel(0, 480);
  await expect.poll(() => inner.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  await dialog.evaluate((node) => {
    const sample = document.createElement('output');
    sample.dataset.testid = 'modal-exit-sample';
    document.body.append(sample);
    const observer = new MutationObserver(() => {
      if (node.getAttribute('data-reveal-state') !== 'out') return;
      observer.disconnect();
      const style = getComputedStyle(node);
      const startOpacity = Number.parseFloat(style.opacity);
      const animation = style.animationName;
      const duration = style.animationDuration;
      // Sample within the browser clock; separate protocol calls must not consume the exit interval.
      setTimeout(() => {
        sample.textContent = JSON.stringify({
          startOpacity, animation, duration,
          retained: node.isConnected,
          locked: getComputedStyle(document.documentElement).overflowY === 'hidden',
        });
      }, 550);
    });
    observer.observe(node, { attributes: true, attributeFilter: ['data-reveal-state'] });
  });
  await page.setViewportSize({ width: 1024, height: 640 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const sample = page.getByTestId('modal-exit-sample');
  await expect(sample).not.toBeEmpty();
  const exit = JSON.parse(await sample.textContent() ?? '{}');
  expect(exit).toMatchObject({ animation: 'ui-reveal-out', duration: '0.8s', retained: true, locked: true });
  expect(exit.startOpacity).toBeGreaterThan(0);
  await sample.evaluate((node) => node.remove());
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  await page.setViewportSize({ width: 390, height: 640 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(dialog).toHaveCount(1);
  await expect(dialog.locator('..')).toHaveAttribute('data-open', 'true');
  await dialog.getByRole('button', { name: 'Close mobile declaration' }).click();
  await expect(trigger).toBeFocused();
  await expect(dialog).toHaveCount(0);
});

test('declarative Modal reduced motion still releases the shared lock after closing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await openFixture(page);
  const trigger = page.getByRole('button', { name: 'Open mobile declaration', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Mobile declaration', exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('[role="dialog"][aria-label="Mobile declaration"]')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
});

test('Modal restores a sticky header trigger without changing the page position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await openFixture(page);
  const trigger = page.getByRole('button', { name: 'Open mobile declaration', exact: true });
  await trigger.evaluate((node) => {
    document.documentElement.style.scrollbarGutter = 'stable';
    document.documentElement.style.overflowAnchor = 'none';
    const header = document.createElement('header');
    header.style.cssText = 'position: sticky; top: 0; z-index: 2000';
    document.getElementById('root')!.prepend(header);
    header.append(node);
    window.scrollTo({ top: 600, behavior: 'instant' });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  const bounds = await trigger.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  const dialog = page.getByRole('dialog', { name: 'Mobile declaration', exact: true });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(600);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(600);
});

test('Modal scroll lock keeps independent provider leases through provider unmounts and restores inline priorities', async ({ page }) => {
  await openFixture(page);
  const baseline = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty('overflow-x', 'clip', 'important');
    root.style.setProperty('overflow-y', 'scroll');
    body.style.setProperty('overflow', 'auto', 'important');
    body.style.setProperty('padding', '24px 40px', 'important');
    return { width: root.clientWidth, padding: Number.parseFloat(getComputedStyle(body).paddingRight) };
  });
  await page.getByRole('button', { name: 'Open First independent lease', exact: true }).click();
  const first = page.getByRole('dialog', { name: 'First independent lease', exact: true });
  await expect(first).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  const lockedPadding = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.body).paddingRight));
  const reclaimedWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(lockedPadding).toBe(baseline.padding + reclaimedWidth - baseline.width);

  await first.getByRole('button', { name: 'Open second independent lease' }).click();
  const second = page.getByRole('dialog', { name: 'Second independent lease', exact: true });
  await expect(second).toBeVisible();
  expect(await page.evaluate(() => Number.parseFloat(getComputedStyle(document.body).paddingRight))).toBe(lockedPadding);
  await second.getByRole('button', { name: 'Unmount first provider', exact: true }).click();
  await expect(page.locator('[role="dialog"][aria-label="First independent lease"]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await second.getByRole('button', { name: 'Unmount Second independent lease', exact: true }).click();
  await expect(second).toHaveCount(0);
  expect(await page.evaluate(() => ({
    rootX: document.documentElement.style.getPropertyValue('overflow-x'),
    rootXPriority: document.documentElement.style.getPropertyPriority('overflow-x'),
    rootY: document.documentElement.style.getPropertyValue('overflow-y'),
    rootYPriority: document.documentElement.style.getPropertyPriority('overflow-y'),
    bodyOverflow: document.body.style.getPropertyValue('overflow'),
    bodyOverflowPriority: document.body.style.getPropertyPriority('overflow'),
    padding: document.body.style.getPropertyValue('padding'),
    paddingPriority: document.body.style.getPropertyPriority('padding-right'),
  }))).toEqual({ rootX: 'clip', rootXPriority: 'important', rootY: 'scroll', rootYPriority: '', bodyOverflow: 'auto', bodyOverflowPriority: 'important', padding: '24px 40px', paddingPriority: 'important' });
});

test('Modal scroll lock stays while stacked dialogs exit and releases after the final DOM removal', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Open stacked modal', exact: true }).click();
  await page.getByTestId('open-top-modal').click();
  const top = page.locator('[role="dialog"][aria-label="Top stacked modal"]');
  const lower = page.locator('[role="dialog"][aria-label="Lower stacked modal"]');
  await expect(top).toBeVisible();
  await expect(top.locator('..')).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('top-first')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(top.locator('..')).toHaveAttribute('data-open', 'false');
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await expect(top).toHaveCount(0);
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await page.keyboard.press('Escape');
  await expect(lower.locator('..')).toHaveAttribute('data-open', 'false');
  await expect(lower).toHaveCount(1);
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await expect(lower).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
});

test('Modal scroll lock allows inner wheel scrolling while page wheel stays blocked without SmoothScroll', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Open First independent lease', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'First independent lease', exact: true });
  await expect(dialog).toBeVisible();
  const inner = dialog.locator(':scope > div');
  const pageY = await page.evaluate(() => window.scrollY);
  expect(await inner.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Open second independent lease' })).toBeFocused();
  await inner.hover();
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => inner.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  await page.mouse.move(8, 8);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
});

test('Modal scroll lock preserves body padding when a stable scrollbar gutter remains reserved', async ({ page }) => {
  await openFixture(page);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('scrollbar-gutter', 'stable');
    document.body.style.setProperty('padding-right', '36px', 'important');
  });
  const before = await page.evaluate(() => document.documentElement.clientWidth);
  await page.getByRole('button', { name: 'Open First independent lease', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'First independent lease', exact: true });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(before);
  await expect(page.locator('body')).toHaveCSS('padding-right', '36px');
  await dialog.getByRole('button', { name: 'Unmount First independent lease', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.getPropertyValue('padding-right'))).toBe('36px');
  expect(await page.evaluate(() => document.body.style.getPropertyPriority('padding-right'))).toBe('important');
});

test('stacked Modals isolate the lower dialog and restore focus when the top closes', async ({ page }) => {
  await openFixture(page);
  const opener = page.getByRole('button', { name: 'Open stacked modal' });
  await opener.click();
  const lower = page.locator('[role="dialog"][aria-label="Lower stacked modal"]');
  await expect(lower).toBeVisible();
  const openTop = page.getByTestId('open-top-modal');
  await openTop.click();

  const top = page.locator('[role="dialog"][aria-label="Top stacked modal"]');
  await expect(top).toBeVisible();
  const lowerRoot = lower.locator('xpath=ancestor::*[@aria-hidden]').first();
  const topRoot = top.locator('xpath=ancestor-or-self::*[@aria-hidden]').first();
  await expect(lowerRoot).toHaveAttribute('aria-hidden', 'true');
  await expect(lowerRoot).toHaveAttribute('inert', '');
  await expect(topRoot).toHaveAttribute('aria-hidden', 'false');

  const lowerButton = page.getByTestId('open-top-modal');
  await lowerButton.evaluate((node) => (node as HTMLElement).focus());
  await expect(lowerButton).not.toBeFocused();

  const first = page.getByTestId('top-first');
  const last = page.getByTestId('top-last');
  await first.focus();
  await first.press('Shift+Tab');
  await expect(last).toBeFocused();
  await last.press('Escape');
  await expect(top).toHaveCount(0);
  await expect.poll(() => lowerRoot.getAttribute('aria-hidden')).toBe('false');
  await expect(lowerButton).toBeFocused();
  await expect(lowerRoot).not.toHaveAttribute('inert', '');
});

test('Carousel initializes each public effect with its corresponding Swiper mode', async ({ page }) => {
  await openFixture(page);
  const swiper = page.locator('[data-testid="effect-carousel"] .swiper');
  await expect(swiper).toHaveClass(/swiper-initialized/);

  const effects = [
    ['fade', 'swiper-fade'],
    ['cube', 'swiper-cube'],
    ['coverflow', 'swiper-coverflow'],
    ['flip', 'swiper-flip'],
  ] as const;
  for (const [effect, className] of effects) {
    await page.evaluate((next) => window.__setCarouselEffect?.(next), effect);
    await expect(swiper).toHaveClass(new RegExp(className));
  }

  await page.evaluate(() => window.__setCarouselEffect?.('slide'));
  await expect(swiper).not.toHaveClass(/swiper-(fade|cube|coverflow|flip)/);
  await expect(swiper.locator('.swiper-slide-active')).toContainText('Effect slide one');
});

test('VideoPlayer timeline keyboard moves by documented increments and endpoints', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', { configurable: true, get: () => 120 });
    Object.defineProperty(HTMLVideoElement.prototype, 'readyState', { configurable: true, get: () => 1 });
    Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
      configurable: true,
      get: () => window.__videoTime ?? 0,
      set: (value: number) => {
        window.__videoTime = value;
        window.__videoSeeks = [...(window.__videoSeeks ?? []), value];
      },
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'fastSeek', { configurable: true, value: undefined });
  });
  await openFixture(page);
  const timeline = page.getByRole('slider', { name: 'Перемотка' });
  await expect(timeline).toHaveAttribute('aria-valuemax', '120');
  await timeline.focus();
  await timeline.press('ArrowRight');
  await expect(timeline).toHaveAttribute('aria-valuenow', '5');
  await expect(timeline).toHaveAttribute('aria-valuetext', '00:00:05 из 00:02:00');
  await timeline.press('PageUp');
  await expect(timeline).toHaveAttribute('aria-valuenow', '17');
  await timeline.press('Home');
  await expect(timeline).toHaveAttribute('aria-valuenow', '0');
  await timeline.press('End');
  await expect(timeline).toHaveAttribute('aria-valuenow', '120');
  expect(await page.evaluate(() => window.__videoSeeks)).toEqual([5, 17, 0, 120]);

  const volume = page.getByRole('slider', { name: 'Громкость' });
  await expect(volume).toHaveAttribute('aria-valuenow', '100');
  await volume.press('ArrowDown');
  await expect(volume).toHaveAttribute('aria-valuenow', '95');
  await volume.press('Home');
  await expect(volume).toHaveAttribute('aria-valuenow', '0');
  await volume.press('ArrowUp');
  await expect(volume).toHaveAttribute('aria-valuenow', '5');
  await volume.press('End');
  await expect(volume).toHaveAttribute('aria-valuenow', '100');
});

test('shared motion primitives preserve enter, move, leave, and linked hover callbacks', async ({ page }) => {
  await openFixture(page);

  for (const key of ['text', 'grid', 'grid-item', 'img']) {
    const node = page.getByTestId(`motion-${key}`);
    const target = node;
    await target.hover();
    if (key !== 'grid-item') await expect(page.getByTestId('motion-state')).toHaveAttribute('state', 'hover');
    const bounds = await target.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) continue;
    await page.mouse.move(bounds.x + Math.min(8, bounds.width / 3), bounds.y + Math.min(8, bounds.height / 3));
    await page.mouse.move(bounds.x + Math.min(20, bounds.width / 2), bounds.y + Math.min(20, bounds.height / 2));
    await page.mouse.move(8, 8);
    if (key !== 'grid-item') await expect(page.getByTestId('motion-state')).not.toHaveAttribute('state', 'hover');
    if (key === 'img') {
      await node.click();
      expect(await page.evaluate(() => window.__imageMotionTargets)).toContain('IMG');
      expect(await page.evaluate(() => window.__imageClickTargets)).toEqual(['IMG']);
      expect(await node.evaluate((image) => window.__imageRoot === image.closest('.ui-img'))).toBe(true);
    } else {
      expect(await page.evaluate((eventKey) => window.__motionEvents[eventKey] ?? [], key), key).toEqual(
        expect.arrayContaining(['enter', 'move', 'leave']),
      );
    }
  }
});

test('Checkbox, Radio, and SwitchButton show focus-visible state through native Tab navigation', async ({ page }) => {
  await openFixture(page);
  const start = page.getByTestId('focus-sequence-start');
  const checkbox = page.getByRole('checkbox', { name: 'Keyboard checkbox' });
  const radio = page.getByRole('radio', { name: 'Keyboard radio' });
  const toggle = page.getByRole('checkbox', { name: 'Keyboard switch' });

  await start.focus();
  await start.press('Tab');
  await expect(checkbox).toBeFocused();
  const checkboxOutline = await checkbox.evaluate((input) => input.nextElementSibling ? getComputedStyle(input.nextElementSibling).outlineStyle : null);
  expect(checkboxOutline).not.toBe('none');
  await checkbox.press('Space');
  await expect(checkbox).toBeChecked();

  await checkbox.press('Tab');
  await expect(radio).toBeFocused();
  const radioOutline = await radio.evaluate((input) => input.nextElementSibling ? getComputedStyle(input.nextElementSibling).outlineStyle : null);
  expect(radioOutline).not.toBe('none');
  await radio.press('Space');
  await expect(radio).toBeChecked();

  await radio.press('Tab');
  await expect(toggle).toBeFocused();
  const switchOutline = await toggle.evaluate((input) => input.nextElementSibling ? getComputedStyle(input.nextElementSibling).outlineStyle : null);
  expect(switchOutline).not.toBe('none');
  await toggle.press('Space');
  await expect(toggle).toBeChecked();
});

test('Input calendar month and year controls are keyboard-operable', async ({ page }) => {
  await openFixture(page);
  const date = page.getByTestId('keyboard-date');
  const calendarField = page.getByTestId('calendar-control');
  await calendarField.locator('[data-input-action="true"]').click();

  const chooseMonth = page.getByRole('button', { name: 'Choose month' });
  const previousMonth = page.getByRole('button', { name: 'Previous month' });
  const nextMonth = page.getByRole('button', { name: 'Next month' });
  const nextYear = page.getByRole('button', { name: 'Next year' });
  const previousYear = page.getByRole('button', { name: 'Previous year' });
  await expect(chooseMonth).toBeVisible();
  await expect(chooseMonth).toContainText('Январь');
  await expect(date).toBeFocused();

  await date.press('Tab');
  await expect(previousMonth).toBeFocused();
  await previousMonth.press('Enter');
  await expect(chooseMonth).toContainText('Декабрь');
  const year = nextYear.locator('xpath=../..').locator('xpath=..');
  await previousMonth.press('Tab');
  await expect(chooseMonth).toBeFocused();
  await chooseMonth.press('Tab');
  await expect(nextYear).toBeFocused();
  await nextYear.press('Enter');
  await expect(year).toContainText('2025');
  await nextYear.press('Tab');
  await expect(previousYear).toBeFocused();
  await previousYear.press('Space');
  await expect(year).toContainText('2024');
  await previousYear.press('Tab');
  await expect(nextMonth).toBeFocused();
  await nextMonth.press('Space');
  await expect(chooseMonth).toContainText('Январь');

  await chooseMonth.focus();
  await chooseMonth.press('Enter');
  await expect(chooseMonth).toHaveAttribute('aria-expanded', 'true');
  const july = page.getByRole('button', { name: 'Июл' });
  await july.focus();
  await july.press('Enter');
  await expect(chooseMonth).toContainText('Июль');
  await expect(chooseMonth).toHaveAttribute('aria-expanded', 'false');
  await expect(date).toHaveValue('15.01.2025');
});

test('motion profiler records static and enabled 40-Text updates as an observation', async ({ page }) => {
  await openFixture(page);
  const box = page.getByTestId('motion-profile-box');
  await expect(box).toContainText('Profile text A 40');
  const staticSample = await page.evaluate(() => window.__motionProfileSamples.at(-1));
  expect(staticSample).toBeTruthy();
  await page.getByTestId('motion-profile-update').click();
  await expect(box).toContainText('Profile text B 40');
  const staticTextUpdate = await page.evaluate(() => window.__motionProfileSamples.at(-1));

  await page.getByTestId('motion-profile-toggle').click();
  await expect(box).toHaveAttribute('data-profile-mode', 'motion');
  const enabledSample = await page.evaluate(() => window.__motionProfileSamples.at(-1));
  await page.getByTestId('motion-profile-update').click();
  await expect(box).toContainText('Profile text A 40');
  const motionTextUpdate = await page.evaluate(() => window.__motionProfileSamples.at(-1));
  const observation = { static: staticSample, staticTextUpdate, enabled: enabledSample, motionTextUpdate };
  console.log('[motion-profiler-observation]', JSON.stringify(observation));
  expect(observation.staticTextUpdate?.phase).toBe('update');
  expect(observation.enabled?.phase).toBe('update');
  expect(observation.motionTextUpdate?.phase).toBe('update');
});

test('date calendar inside Modal stays in its focus scope and Escape restores the input', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Open calendar focus modal' }).click();
  const modal = page.getByRole('dialog', { name: 'Calendar focus modal' });
  const date = page.getByTestId('modal-date');
  const field = page.getByTestId('modal-calendar-control');
  await expect(modal).toBeVisible();
  await field.locator('[data-input-action="true"]').click();
  await expect(date).toBeFocused();

  const previousMonth = page.getByRole('button', { name: 'Previous month' });
  const chooseMonth = page.getByRole('button', { name: 'Choose month' });
  const nextYear = page.getByRole('button', { name: 'Next year' });
  const previousYear = page.getByRole('button', { name: 'Previous year' });
  const nextMonth = page.getByRole('button', { name: 'Next month' });
  await date.press('Tab');
  await expect(previousMonth).toBeFocused();
  await previousMonth.press('Tab');
  await expect(chooseMonth).toBeFocused();
  await chooseMonth.press('Tab');
  await expect(nextYear).toBeFocused();
  await nextYear.press('Tab');
  await expect(previousYear).toBeFocused();
  await previousYear.press('Tab');
  await expect(nextMonth).toBeFocused();
  expect(await modal.evaluate((dialog) => Boolean(dialog.parentElement?.contains(document.activeElement)))).toBe(true);

  await nextMonth.press('Escape');
  await expect(previousMonth).toHaveCount(0);
  await expect(date).toBeFocused();
  await expect(modal).toBeVisible();
});


test('scroll selector recomputes changed closures without another scroll event', async ({ page }) => {
  await openFixture(page);
  const result = page.getByTestId('scroll-selector-result');
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(result).toHaveText('true');
  const y = await page.evaluate(() => window.scrollY);
  await page.getByTestId('scroll-selector-limit').click();
  await expect(result).toHaveText('false');
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  await page.getByTestId('scroll-selector-limit').click();
  await expect(result).toHaveText('true');
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
});

test('button appearance composes hover and idle on the same DOM node', async ({ page }) => {
  await openFixture(page);
  const button = page.getByTestId('button-composed-motion');
  await expect(button).toHaveAttribute('data-reveal', 'up');
  await expect(button).toHaveAttribute('data-button-hover', 'rise');
  await expect(button).toHaveAttribute('data-button-idle', 'glow');
});

test('Lexical renderer validates unknown nodes and preserves valid formatted neighbors', async ({ page }) => {
  await openFixture(page);
  const content = page.getByTestId('lexical-unknown-nodes');
  await expect(content.getByRole('heading', { level: 2 })).toHaveText('Validated heading');
  await expect(content.locator('h2 em')).toHaveText('Validated heading');
  await expect(content.locator('p')).toHaveText('Valid neighbor');
  await expect(content).not.toContainText('Invalid tag');
  await expect(content.locator('script')).toHaveCount(0);
});
