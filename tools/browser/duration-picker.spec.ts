import { expect, test } from '@playwright/test';

test('duration wheels support keyboard, wheel, drag and a bounded disabled state', async ({ page }) => {
  await page.goto('/');
  const picker = page.getByRole('group', { name: 'Duration', exact: true });
  const hours = picker.getByRole('spinbutton', { name: 'Hours' });
  const minutes = picker.getByRole('spinbutton', { name: 'Minutes' });
  const output = page.getByTestId('duration-value');
  await expect(picker.getByText(':', { exact: true })).toBeVisible();
  // A structural selection surface must paint even without a generated bg utility.
  const band = picker.locator('.ui-duration-selected-band');
  const background = await band.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  expect(background).not.toBe('transparent');
  const geometry = await hours.boundingBox();
  if (!geometry) throw new Error('Hours wheel is not visible');
  // The fixture scales rpx with the viewport; 48×72 is the design geometry.
  expect(geometry.width).toBeLessThanOrEqual(48);
  expect(geometry.height / geometry.width).toBeCloseTo(72 / 48);
  const pickerBounds = await picker.boundingBox();
  expect(pickerBounds?.height).toBeLessThanOrEqual(100);
  await hours.click({ position: { x: geometry.width / 2, y: geometry.height * 5 / 6 } });
  await expect(output).toHaveText('150');
  await hours.click({ position: { x: geometry.width / 2, y: geometry.height / 6 } });
  await expect(output).toHaveText('90');
  await hours.focus();
  await page.keyboard.press('ArrowUp');
  await expect(output).toHaveText('150');
  await page.keyboard.press('Tab');
  await expect(minutes).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(output).toHaveText('149');
  await minutes.hover();
  await page.mouse.wheel(0, 60);
  await expect(output).toHaveText('150');
  const box = await hours.boundingBox();
  if (!box) throw new Error('Hours wheel is not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 24);
  await page.mouse.up();
  await expect(output).toHaveText('210');
  await hours.focus();
  await page.keyboard.press('End');
  await expect(output).toHaveText('1440');
  await expect(minutes).toHaveAttribute('aria-valuemax', '0');
  await minutes.focus();
  await page.keyboard.press('ArrowUp');
  await expect(output).toHaveText('1440');
  const disabled = page.getByRole('group', { name: 'Disabled duration' });
  await expect(disabled.getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute('tabindex', '-1');
  await disabled.getByRole('spinbutton', { name: 'Hours' }).hover();
  await page.mouse.wheel(0, 60);
  await expect(output).toHaveText('1440');
});

test('wheel digits move through real intermediate frames, reverse and settle; reduced motion swaps immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const picker = page.getByRole('group', { name: 'Duration', exact: true });
  const hours = picker.getByRole('spinbutton', { name: 'Hours' });
  await hours.focus();
  await page.keyboard.press('ArrowUp');
  await expect(hours).toHaveAttribute('aria-valuenow', '2');
  const incoming = hours.locator('[data-motion="in"]');
  await expect(incoming).toHaveCount(1);
  const intermediate = await incoming.evaluate(node => new Promise<{ offset: number; opacity: number }>((resolve, reject) => {
    const inspect = () => {
      const animation = node.getAnimations()[0];
      const progress = animation?.effect?.getComputedTiming().progress;
      if (progress !== null && progress !== undefined && progress > .1 && progress < .95) {
        const style = getComputedStyle(node);
        resolve({ offset: new DOMMatrixReadOnly(style.transform).m42, opacity: Number(style.opacity) });
      } else if (!animation || animation.playState === 'finished') reject(new Error('No intermediate wheel animation frame'));
      else requestAnimationFrame(inspect);
    };
    inspect();
  }));
  expect(intermediate.offset).toBeGreaterThan(0);
  expect(intermediate.opacity).toBeGreaterThan(0);
  expect(intermediate.opacity).toBeLessThan(1);
  await expect(hours.locator('[data-motion="out"]')).toHaveCount(0);
  expect(await hours.locator('.ui-duration-wheel-layer').evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m42)).toBe(0);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(hours).toHaveAttribute('aria-valuenow', '2');
  await expect(hours.locator('[data-motion="out"]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.press('ArrowDown');
  await expect(hours).toHaveAttribute('aria-valuenow', '1');
  await expect(hours.locator('[data-motion="out"]')).toHaveCount(0);
  expect(await hours.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await page.addStyleTag({ content: '.ui-duration-picker { --rpx: 1px; zoom: 2; }' });
  await picker.screenshot({ path: test.info().outputPath('duration-picker.png'), scale: 'css' });
});
