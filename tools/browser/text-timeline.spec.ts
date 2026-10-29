import { expect, test } from '@playwright/test';

test('reveal prepares every host before reading scoped duration and preserves cascade cleanup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const getAnimations = Document.prototype.getAnimations;
    const initialReads: string[][] = [];
    const reads: string[][] = [];
    Document.prototype.getAnimations = function() {
      if (this.querySelector('[data-testid="reveal-batch-a0"]:not([data-reveal-state])')) {
        initialReads.push(Array.from(document.querySelectorAll('[data-testid^="reveal-batch-"]'), el => el.getAttribute('data-reveal-state') ?? 'unset'));
        sessionStorage.setItem('revealInitialReads', JSON.stringify(initialReads));
      }
      if (this.querySelector('[data-testid="reveal-batch-a0"][data-reveal-state="in"]')) {
        reads.push(Array.from(document.querySelectorAll('[data-testid^="reveal-batch-"]'), el => el.getAttribute('data-reveal-state') ?? 'unset'));
        sessionStorage.setItem('revealBatchReads', JSON.stringify(reads));
      }
      return getAnimations.call(this);
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('reveal-load-child-0')).toHaveCSS('animation-delay', '0.1s');
  await expect(page.getByTestId('reveal-load-child-1')).toHaveCSS('animation-delay', '0.18s');
  await page.addStyleTag({ content: '[data-testid="reveal-batch-a1"] { --reveal-duration: 0.6s; }' });
  const scope = page.getByTestId('reveal-batches');
  const targets = scope.locator('[data-testid^="reveal-batch-"]');
  await expect(targets.first()).toHaveAttribute('data-reveal-state', 'wait');
  const initialReads = await page.evaluate(() => JSON.parse(sessionStorage.getItem('revealInitialReads') ?? '[]') as string[][]);
  expect(initialReads).toHaveLength(1);
  expect(initialReads.every(states => states.length === 4 && states.every(state => state === 'unset'))).toBe(true);
  await scope.scrollIntoViewIfNeeded();
  await expect(targets.first()).toHaveAttribute('data-reveal-state', 'in');
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('revealBatchReads') ?? '[]').length)).toBeGreaterThan(0);
  const reads = await page.evaluate(() => JSON.parse(sessionStorage.getItem('revealBatchReads') ?? '[]') as string[][]);
  expect(reads.length).toBeGreaterThan(0);
  expect(reads.every(states => states.length === 4 && states.every(state => state === 'in'))).toBe(true);
  for (const [index, delay] of ['0s', '0.06s', '0.1s', '0.18s'].entries()) {
    await expect(targets.nth(index)).toHaveCSS('animation-delay', delay);
  }
  await expect(page.getByTestId('batch-descendant')).toHaveCSS('--reveal-delay', '0s');
  await expect(page.getByTestId('reveal-batch-a0')).toHaveAttribute('data-reveal-state', 'done');
  await expect(page.getByTestId('reveal-batch-a1')).toHaveAttribute('data-reveal-state', 'in');
  for (const target of await targets.all()) {
    await expect(target).toHaveAttribute('data-reveal-state', 'done');
  }
});

test('reveal follows native pause, scoped duration changes and cancellation without stale deadlines', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.addStyleTag({ content: '[data-testid="reveal-batch-a1"] { --reveal-duration: 0.6s; }' });
  const target = page.getByTestId('reveal-batch-a1');
  await page.getByTestId('reveal-batches').scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute('data-reveal-state', 'in');
  await target.evaluate(el => {
    const animation = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'ui-reveal');
    if (!animation) throw new Error('Missing reveal clock');
    animation.pause();
    animation.currentTime = 160;
  });
  await page.waitForTimeout(850);
  await expect(target).toHaveAttribute('data-reveal-state', 'in');
  await target.evaluate(el => {
    el.style.setProperty('--reveal-duration', '1.2s');
    const animation = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'ui-reveal');
    if (!animation) throw new Error('Lost paused reveal clock');
    animation.finish();
  });
  await expect(target).toHaveAttribute('data-reveal-state', 'done');
  await page.goto('/?cancel-reveal');
  await page.addStyleTag({ content: '[data-testid="reveal-batch-a1"] { --reveal-duration: 2s; }' });
  await page.getByTestId('reveal-batches').scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute('data-reveal-state', 'in');
  await target.evaluate(el => el.getAnimations().forEach(animation => animation.cancel()));
  await expect(target).toHaveAttribute('data-reveal-state', 'done');
  await expect(target).toHaveCSS('will-change', 'auto');
});

test('release between entry and clock registration cancels pending completion work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?smooth');
  const result = await page.evaluate(async () => {
    const fixturePath = '/text-timeline.fixture.tsx';
    const { armReveal, releaseReveal, resolveReveal } = await import(fixturePath);
    const node = document.createElement('div');
    node.dataset.reveal = 'up';
    node.style.cssText = 'position:absolute;top:100px;width:40px;height:40px;--reveal-duration:10s';
    document.body.appendChild(node);
    let released = false;
    const observer = new MutationObserver(() => {
      if (node.getAttribute('data-reveal-state') !== 'in') return;
      releaseReveal(node);
      node.remove();
      released = true;
    });
    observer.observe(node, { attributes: true, attributeFilter: ['data-reveal-state'] });
    armReveal(node, resolveReveal('up'));
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      return { released, state: node.getAttribute('data-reveal-state'), animations: node.getAnimations().length };
    } finally {
      observer.disconnect(); releaseReveal(node); node.remove();
    }
  });
  expect(result).toEqual({ released: true, state: null, animations: 0 });
});

test('reveal without document animation snapshots keeps scoped timing fallback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => Object.defineProperty(Document.prototype, 'getAnimations', { configurable: true, value: undefined }));
  await page.goto('/');
  await page.addStyleTag({ content: '[data-testid="reveal-batch-a1"] { --reveal-duration: 0.6s; }' });
  const states = await page.getByTestId('reveal-batches').evaluate(async (host) => {
    const short = host.querySelector('[data-testid="reveal-batch-a0"]')!;
    const long = host.querySelector('[data-testid="reveal-batch-a1"]')!;
    const snapshots: { short: string | null; long: string | null }[] = [];
    await new Promise<void>((resolve) => {
      // Capture both states in the browser: separate Playwright polls can miss the short window.
      const observer = new MutationObserver(() => {
        const state = { short: short.getAttribute('data-reveal-state'), long: long.getAttribute('data-reveal-state') };
        snapshots.push(state);
        if (state.long === 'done') { observer.disconnect(); resolve(); }
      });
      observer.observe(host, { subtree: true, attributes: true, attributeFilter: ['data-reveal-state'] });
      host.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    return snapshots;
  });
  expect(states).toContainEqual({ short: 'done', long: 'in' });
  expect(states.at(-1)).toEqual({ short: 'done', long: 'done' });
});

test('batched reveal preserves expired hold, fresh hold and release before initialization', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?smooth');
  const states = await page.evaluate(async () => {
    const fixturePath = '/text-timeline.fixture.tsx';
    const { armReveal, releaseReveal, resolveReveal } = await import(fixturePath);
    const config = resolveReveal('up');
    const nodes = [0, 1, 2, 3].map(index => {
      const node = document.createElement('div');
      node.dataset.reveal = 'up';
      node.style.cssText = `position:absolute;top:${index === 2 ? 50000 : 100}px;width:40px;height:40px`;
      if (index === 0 || index === 2) node.style.animation = 'none';
      document.body.appendChild(node);
      armReveal(node, config);
      return node;
    });
    const removed = nodes[3];
    if (removed) { releaseReveal(removed); removed.remove(); }
    try {
      await Promise.resolve();
      return nodes.map(node => node.getAttribute('data-reveal-state'));
    } finally {
      for (const node of nodes) { releaseReveal(node); node.remove(); }
    }
  });
  expect(states).toEqual(['done', 'wait', 'wait', null]);
});

test('whole text slide moves matching letters too and settles after rapid changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const baselineDelta = await page.getByTestId('slide-inline').evaluate(node => {
    const plain = node.firstChild;
    const animated = node.querySelector('.ui-slide-value-static')?.firstChild;
    if (!plain || !animated) throw new Error('Missing inline label');
    const top = (text: Node) => {
      const range = document.createRange();
      range.selectNodeContents(text);
      return range.getBoundingClientRect().top;
    };
    return Math.abs(top(plain) - top(animated));
  });
  expect(baselineDelta).toBeLessThan(0.5);
  const label = page.getByTestId('slide-label');
  await label.scrollIntoViewIfNeeded();
  await label.evaluate(node => node.setAttribute('data-identity', 'same-heading'));
  await page.getByTestId('slide-label-update').click();
  await expect(label.locator('[data-swap-out]')).toHaveText('Подвески');
  await expect(label.locator('[data-swap-in]')).toHaveText('Подвески новые');
  await expect(label.locator('.ui-slide-swap-static')).toHaveCount(0);
  await expect(label.locator('.ui-slide-value-viewport')).not.toHaveCSS('clip-path', 'none');
  await page.getByTestId('slide-label-update').click();
  await page.getByTestId('slide-label-update').click();
  await expect(label).toHaveText('Серьги');
  await expect(label.locator('[data-swap-out]')).toHaveCount(0);
  await expect(label).toHaveAttribute('data-identity', 'same-heading');
  const resting = await label.boundingBox();
  expect(resting?.height).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('slide-label-update').click();
  await expect(label).toHaveText('Подвески');
  await expect(label.locator('[data-swap-out]')).toHaveCount(0);
});

test('compound Text starts counting at 0%, 50% and 100% of the appearance duration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByTestId('text-timelines').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const nodes = [0, 0.5, 1].map(p => document.querySelector(`[data-testid="timeline-${p}"]`));
    if (!nodes.every(node => node?.getAttribute('data-reveal-state') === 'in')) return false;
    nodes.forEach(node => node?.getAnimations().forEach(animation => animation.pause()));
    return true;
  });
  for (const progress of [0, 0.5, 1]) {
    const node = page.getByTestId(`timeline-${progress}`);
    await expect(node).toHaveAttribute('data-reveal-state', 'in');
    const at = async (time: number) => node.evaluate((el, ms) => {
      const animation = el.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === 'ui-reveal');
      if (!animation) throw new Error('Missing timeline animation');
      animation.pause();
      animation.currentTime = ms;
    }, time);
    const start = 200 + progress * 600;
    await at(start - 1);
    await expect(node.locator('.ui-counter-value')).toHaveText('0');
    await at(start + 200);
    await expect(node.locator('.ui-counter-value')).toHaveText('94');
    expect(await node.locator('.ui-counter-value').evaluate(async (el) => {
      let writes = 0;
      const observer = new MutationObserver((records) => { writes += records.length; });
      observer.observe(el, { childList: true, characterData: true, subtree: true });
      await new Promise((resolve) => setTimeout(resolve, 100));
      observer.disconnect();
      return writes;
    })).toBe(0);
    await at(Math.max(800, start + 400));
    await expect(node.locator('.ui-counter-value')).toHaveText('100');
    await expect(node).toHaveAttribute('data-reveal-state', 'done');
  }
  await page.getByTestId('timeline-rerender').click();
  await expect(page.getByTestId('timeline-1')).toHaveAttribute('data-reveal-state', 'done');
  await expect(page.getByTestId('timeline-zero').locator('.ui-counter-value')).toHaveText('10');
});

test('compound Text honors ancestor delay/stagger, repeats and finishes on reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByTestId('timeline-parent').scrollIntoViewIfNeeded();
  const child = page.getByTestId('timeline-child-1');
  await expect(page.getByTestId('timeline-card-1')).toHaveAttribute('data-reveal-state', 'in');
  await expect(child).toHaveAttribute('data-reveal-state', 'wait');
  await expect(child.locator('.ui-counter-value')).toHaveText('0');
  await expect(child).toHaveAttribute('data-reveal-state', 'done');
  await expect(child.locator('.ui-counter-value')).toHaveText('100');
  const repeat = page.getByTestId('timeline-repeat');
  await repeat.scrollIntoViewIfNeeded();
  await expect(repeat).toHaveAttribute('data-reveal-state', 'done');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(repeat).toHaveAttribute('data-reveal-state', 'wait');
  await expect(repeat.locator('.ui-counter-value')).toHaveText('0');
  await repeat.scrollIntoViewIfNeeded();
  await expect(repeat).toHaveAttribute('data-reveal-state', 'in');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(repeat).toHaveAttribute('data-reveal-state', 'done');
  await expect(repeat.locator('.ui-counter-value')).toHaveText('100');
});

test('reduced motion renders all final values even before entering the viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('timeline-1').locator('.ui-counter-value')).toHaveText('100');
  await expect(page.getByTestId('timeline-1')).toHaveAttribute('data-reveal-state', 'done');
});

test('counter continues on the real clock after appearance finishes and once prevents replay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const target = page.getByTestId('timeline-1');
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute('data-reveal-state', 'done');
  await expect(target.locator('.ui-counter-value')).toHaveText('100');
  await page.evaluate(() => window.scrollTo(0, 0));
  await target.scrollIntoViewIfNeeded();
  await expect(target).toHaveAttribute('data-reveal-state', 'done');
  await expect(target.locator('.ui-counter-value')).toHaveText('100');
});
