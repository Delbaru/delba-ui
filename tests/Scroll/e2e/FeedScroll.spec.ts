import { expect, test } from '@playwright/test';

test('feed follows growth until a reader gesture releases following', async ({ page }) => {
  await page.goto('/?feed-scroll');
  const viewport = page.getByRole('log', { name: 'Feed messages' });
  await expect(viewport).toHaveAttribute('data-scroll-preset', 'feed');
  const scrollTop = () => viewport.evaluate(node => node.scrollTop);
  const bottom = page.getByTestId('feed-show-bottom');
  await expect.poll(scrollTop).toBeGreaterThan(0);
  await expect(bottom).toHaveText('false');

  const followedPosition = await scrollTop();
  await viewport.hover();
  await page.mouse.wheel(0, -(followedPosition + 100));
  await expect.poll(scrollTop).toBe(0);
  await expect(bottom).toHaveText('true');
  const readerPosition = await scrollTop();

  await page.getByRole('button', { name: 'Append message' }).click();
  await expect.poll(scrollTop).toBe(readerPosition);
  await expect(bottom).toHaveText('true');

  await page.getByRole('button', { name: 'Follow latest' }).click();
  await expect.poll(scrollTop).toBeGreaterThan(readerPosition);
  await expect(bottom).toHaveText('false');
});

test('history prepend restores the first visible item after the content shifts', async ({ page }) => {
  await page.goto('/?feed-scroll');
  const viewport = page.getByRole('log', { name: 'Feed messages' });
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  const followedPosition = await viewport.evaluate(node => node.scrollTop);
  await viewport.hover();
  await page.mouse.wheel(0, -600);
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeCloseTo(followedPosition - 600, 0);
  await expect(page.getByTestId('feed-show-bottom')).toHaveText('true');

  const anchor = await viewport.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const visible = [...node.querySelectorAll<HTMLElement>('[data-feed-item]')]
      .find(item => item.getBoundingClientRect().bottom > bounds.top);
    if (!visible) throw new Error('No visible feed anchor');
    return { id: visible.dataset.feedItem, top: visible.getBoundingClientRect().top - bounds.top };
  });
  await page.getByRole('button', { name: 'Prepend with anchor' }).click();
  await expect(viewport.locator(`[data-feed-item="${anchor.id}"]`)).toBeVisible();
  await expect.poll(() => viewport.locator(`[data-feed-item="${anchor.id}"]`).evaluate(node => {
    return node.getBoundingClientRect().top - node.closest('[data-testid="feed-viewport"]')!.getBoundingClientRect().top;
  })).toBeCloseTo(anchor.top, 0);
});

test('a reader gesture invalidates a captured history restoration', async ({ page }) => {
  await page.goto('/?feed-scroll');
  const viewport = page.getByRole('log', { name: 'Feed messages' });
  await viewport.hover();
  await page.mouse.wheel(0, -600);
  await expect(page.getByTestId('feed-show-bottom')).toHaveText('true');

  await page.getByRole('button', { name: 'Capture history anchor' }).click();
  await expect(page.getByTestId('feed-history-result')).toHaveText('captured');
  const beforeGesture = await viewport.evaluate(node => node.scrollTop);

  await viewport.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(beforeGesture);
  const readerPosition = await viewport.evaluate(node => node.scrollTop);

  await page.getByRole('button', { name: 'Restore captured anchor' }).click();
  await expect(page.getByTestId('feed-history-result')).toHaveText('false');
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBe(readerPosition);
});

test('a deleted history anchor falls back to its surviving neighbour and viewport resize preserves reading', async ({ page }) => {
  await page.goto('/?feed-scroll');
  const viewport = page.getByRole('log', { name: 'Feed messages' });
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(600);
  const initialTop = await viewport.evaluate(node => node.scrollTop);
  await viewport.hover();
  await page.mouse.wheel(0, -600);
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeCloseTo(initialTop - 600, 0);
  await expect(page.getByTestId('feed-show-bottom')).toHaveText('true');
  const anchors = await viewport.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const nodes = [...node.querySelectorAll<HTMLElement>('[data-feed-item]')];
    const first = nodes.findIndex(item => item.getBoundingClientRect().bottom > bounds.top);
    const removed = nodes[first];
    const next = nodes[first + 1];
    if (!removed || !next) throw new Error('Two measured history anchors are required');
    return { removed: removed.dataset.feedItem!, next: next.dataset.feedItem!, offset: next.getBoundingClientRect().top - bounds.top };
  });
  await page.getByRole('textbox', { name: 'Remove feed item' }).fill(anchors.removed);
  await page.getByRole('button', { name: 'Replace removed feed anchor' }).click();
  await expect(viewport.locator(`[data-feed-item="${anchors.removed}"]`)).toHaveCount(0);
  await expect.poll(() => viewport.locator(`[data-feed-item="${anchors.next}"]`).evaluate(node =>
    node.getBoundingClientRect().top - node.closest('[data-testid="feed-viewport"]')!.getBoundingClientRect().top,
  )).toBeCloseTo(anchors.offset, 0);
  const before = await viewport.evaluate(node => ({ top: node.scrollTop, height: node.clientHeight }));
  await page.getByRole('button', { name: 'Resize feed viewport' }).click();
  await expect.poll(() => viewport.evaluate(node => node.clientHeight)).toBeGreaterThan(before.height);
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBe(before.top);
  await expect(page.getByTestId('feed-show-bottom')).toHaveText('true');
});
