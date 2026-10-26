import { expect, test } from '@playwright/test';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`select delegates panel motion and preserves selection and focus (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/?dropdown-open');
    const trigger = page.getByRole('button', { name: 'Animated select', exact: true });
    await trigger.locator('..').click({ position: { x: 2, y: 2 } });
    await expect(trigger).toBeFocused();
    const list = page.getByRole('listbox');
    const surface = list.locator('..');
    await expect(surface).toHaveAttribute('data-reveal', 'down');
    await expect(surface).toHaveCSS('border-radius', '0px');
    // A padded field is the geometry anchor; the inner focus target is smaller.
    await expect.poll(async () => {
      const field = await trigger.locator('..').boundingBox();
      const panel = await surface.boundingBox();
      return field && panel ? Math.max(
        Math.abs(field.x - panel.x), Math.abs(field.width - panel.width),
        Math.abs(field.y + field.height - panel.y),
      ) : Infinity;
    }).toBeLessThan(2);
    expect(await list.evaluate(node => node.closest('.ui-collapse'))).toBeNull();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await page.getByRole('option', { name: 'Second option', exact: true }).click();
    await expect(trigger).toHaveText('Second option');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(surface).toBeHidden();
    const field = await trigger.locator('..').boundingBox();
    expect(field).not.toBeNull();
    // Дизайн-единицы масштабируются темой fixture; проверяем пропорцию w/h.
    expect((field?.height ?? 0) / (field?.width ?? 1)).toBeCloseTo(44 / 240, 2);
  });
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`dropdown open animation retains exit, restores focus and survives reversal (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/?dropdown-open');
    const trigger = page.getByRole('button', { name: 'Animated dropdown', exact: true });
    const surface = page.getByTestId('animated-dropdown-surface');
    await expect(surface).toHaveCount(0);
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    const item = page.getByRole('button', { name: 'Animated dropdown item', exact: true });
    await expect(item).toBeFocused();
    const anchor = await page.getByTestId('dropdown-geometry-anchor').boundingBox();
    const panel = await surface.locator('..').boundingBox();
    expect(anchor).not.toBeNull(); expect(panel).not.toBeNull();
    expect(Math.abs((anchor?.x ?? 0) - (panel?.x ?? 0))).toBeLessThan(1);
    expect(Math.abs((anchor?.y ?? 0) + (anchor?.height ?? 0) - (panel?.y ?? 0))).toBeLessThan(1);
    expect(Math.abs((anchor?.width ?? 0) - (panel?.width ?? 0))).toBeLessThan(1);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    if (reducedMotion === 'no-preference') {
      await expect(surface).toHaveCount(1);
      await expect(surface.locator('..')).toHaveAttribute('inert', '');
    }
    await trigger.click();
    await expect(item).toBeVisible();
    await page.waitForTimeout(550);
    await expect(surface).toBeVisible();
    await item.focus();
    await page.keyboard.press('Escape');
    await expect(surface).toHaveCount(0);
    await trigger.click();
    await page.getByRole('button', { name: 'Mount animated dropdown', exact: true }).click();
    await expect(surface).toHaveCount(0);
  });
}

test('dropdown open animation reverses without jumping and controlled refusal retains focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?dropdown-open');
  const trigger = page.getByRole('button', { name: 'Animated dropdown', exact: true });
  const surface = page.getByTestId('animated-dropdown-surface');
  await trigger.click();
  await surface.evaluate((node) => {
    const animation = node.getAnimations().find((item) => item instanceof CSSAnimation && item.animationName === 'ui-reveal');
    if (!animation) throw new Error('missing open animation');
    animation.pause(); animation.currentTime = 200;
  });
  const before = await surface.evaluate((node) => Number(getComputedStyle(node).opacity));
  await trigger.evaluate((node: HTMLButtonElement) => node.click());
  const after = await surface.evaluate((node) => Number(getComputedStyle(node).opacity));
  expect(Math.abs(before - after)).toBeLessThan(0.15);
  await trigger.click();
  await expect(surface).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(surface).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Accept dropdown state' }).uncheck();
  await trigger.click();
  const item = page.getByRole('button', { name: 'Animated dropdown item', exact: true });
  await item.focus();
  await page.keyboard.press('Escape');
  await expect(item).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('retained animated panel is hidden at rest and uses its actual offset parent', async ({ page }) => {
  await page.goto('/?dropdown-open');
  const surface = page.getByTestId('retained-dropdown-surface');
  await expect(surface).toBeHidden();
  await page.getByRole('button', { name: 'Retained animated dropdown', exact: true }).click();
  await expect(surface).toBeVisible();
  const anchor = await page.getByTestId('dropdown-geometry-anchor').boundingBox();
  const panel = await surface.locator('..').boundingBox();
  expect(Math.abs((anchor?.x ?? 0) - (panel?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((anchor?.y ?? 0) + (anchor?.height ?? 0) - (panel?.y ?? 0))).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await expect(surface).toBeHidden();
  await expect(surface).toHaveCount(1);
});

test('dropdown backdrop shares the portal and dismisses without entering the tab order', async ({ page }) => {
  await page.goto('/?dropdown-open');
  const trigger = page.getByRole('button', { name: 'Backdrop dropdown', exact: true });
  await trigger.click();
  const backdrop = page.locator('.fixture-dropdown-backdrop');
  await expect(backdrop).toBeVisible();
  expect(await backdrop.evaluate((node) => node.tagName)).toBe('DIV');
  expect(await backdrop.getAttribute('tabindex')).toBeNull();
  await backdrop.click({ position: { x: 4, y: 4 } });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(backdrop).toHaveCount(0);
});
