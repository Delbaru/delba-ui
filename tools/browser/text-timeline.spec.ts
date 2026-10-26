import { expect, test } from '@playwright/test';

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
