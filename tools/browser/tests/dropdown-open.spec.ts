import { expect, test } from '@playwright/test';

test('single search select can keep the panel open for a refining async query', async ({ page }) => {
  await page.goto('/?dropdown-open');
  await page.getByLabel('Keep selection open').check();
  const trigger = page.getByRole('combobox', { name: 'Find city' });
  await trigger.click();
  const search = page.getByRole('combobox', { name: 'Find city' });
  await search.fill('Coarse');
  await expect(page.getByRole('option', { name: 'Coarse First', exact: true })).toBeVisible();
  await search.press('Enter');
  await expect(trigger).toHaveValue('Coarse');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(search).toBeFocused();
  await search.fill('House');
  await expect(page.getByRole('option', { name: 'House First', exact: true })).toBeVisible();
  await expect(search).toBeFocused();
  await expect(trigger).toHaveValue('House');
});

test('search select keeps input focus across async options and preserves the committed label', async ({ page }) => {
  await page.goto('/?dropdown-open');
  const trigger = page.getByRole('combobox', { name: 'Find city' });
  await trigger.click();
  const search = page.getByRole('combobox', { name: 'Find city' });
  await expect(search).toBeFocused();
  const fieldBox = await search.boundingBox();
  await search.fill('New York');
  await expect(search).toBeFocused();
  await expect(page.getByRole('combobox')).toHaveCount(1);
  await expect(search).toHaveAttribute('aria-busy', 'true');
  await search.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option', { name: 'New York First', exact: true })).toBeVisible();
  const list = page.getByRole('listbox');
  await expect(list.locator('input')).toHaveCount(0);
  const currentBox = await search.boundingBox();
  expect(currentBox?.y).toBe(fieldBox?.y);
  expect(await page.getByRole('option').first().evaluate(node => parseFloat(getComputedStyle(node).paddingLeft))).toBeGreaterThan(5);
  await page.screenshot({ path: test.info().outputPath('search-select.png') });
  await search.press('Home');
  await search.press('End');
  await search.press('Space');
  await expect(search).toHaveValue('New York ');
  await search.fill('New York');
  await expect(page.getByRole('option', { name: 'New York Second', exact: true })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('ArrowUp');
  await search.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveValue('New York First');
  await expect(trigger).toBeFocused();
  expect(await page.getByRole('form', { name: 'Search select form' }).evaluate(node => new FormData(node as HTMLFormElement).get('city'))).toBe('New York-1');
  await trigger.click();
  await search.fill('Late');
  await search.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveValue('New York First');
  await page.waitForTimeout(650);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const outside = page.getByRole('button', { name: 'Outside searchable select' });
  await outside.click();
  await expect(outside).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('search select uses one styled field above a spaced panel on desktop and mobile', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?dropdown-open');
    const input = page.getByRole('combobox', { name: 'Find city' });
    await expect(input).toHaveValue('Saved city');
    const before = await input.boundingBox();
    await input.click();
    await input.fill('City');
    const option = page.getByRole('option', { name: 'City First', exact: true });
    await expect(option).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Async city', exact: true })).toHaveCount(0);
    const after = await input.boundingBox();
    expect(after?.y).toBe(before?.y);
    const geometry = await input.evaluate(node => {
      const field = node.closest('[class*="SelectTrigger"]')?.parentElement;
      const rect = field?.getBoundingClientRect();
      const style = field && getComputedStyle(field);
      return { y: rect?.bottom ?? 0, border: parseFloat(style?.borderLeftWidth ?? '0'), padding: parseFloat(style?.paddingLeft ?? '0') };
    });
    expect(geometry.border).toBeGreaterThan(0);
    expect(geometry.padding).toBeGreaterThan(5);
    const panel = page.getByRole('listbox').locator('..');
    expect((await panel.boundingBox())?.y).toBeGreaterThanOrEqual(geometry.y - 2);
    expect(await option.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft))).toBeGreaterThan(5);
    await page.screenshot({ path: test.info().outputPath('search-select-' + width + '.png') });
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  }
});

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

test('outside click uses the painted surface rather than empty positioning space, retaining nested portals', async ({ page }) => {
  await page.goto('/?dropdown-open');
  const trigger = page.getByRole('button', { name: 'Wide dropdown anchor', exact: true });
  const surface = page.getByTestId('narrow-dropdown-surface');
  await trigger.click();
  await page.getByRole('button', { name: 'Inside narrow surface', exact: true }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Nested narrow dropdown', exact: true }).click();
  await page.getByRole('button', { name: 'Nested narrow item', exact: true }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const painted = await surface.boundingBox();
  const positioning = await surface.locator('xpath=ancestor::*[@data-dropdown-ancestors][1]').boundingBox();
  expect(painted).not.toBeNull();
  expect(positioning).not.toBeNull();
  expect((positioning?.width ?? 0) - (painted?.width ?? 0)).toBeGreaterThan(80);
  if (!painted) throw new Error('Dropdown surface is missing');
  await page.mouse.click(painted.x + painted.width + 40, painted.y + 12);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
test('point menu restores its opener after Escape clears point and removes focused children', async ({ page }) => {
  await page.goto('/?dropdown-open');
  const opener = page.getByRole('button', { name: 'Point menu opener', exact: true });
  await opener.focus();
  await opener.press('Enter');
  const action = page.getByRole('button', { name: 'Point menu action', exact: true });
  await expect(action).toBeFocused();
  await action.press('Escape');
  await expect(action).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('point menu outside dismissal preserves the clicked control focus', async ({ page }) => {
  await page.goto('/?dropdown-open');
  const opener = page.getByRole('button', { name: 'Point menu opener', exact: true });
  await opener.focus();
  await opener.press('Enter');
  await expect(page.getByRole('button', { name: 'Point menu action', exact: true })).toBeFocused();
  const outside = page.getByRole('button', { name: 'Outside point menu', exact: true });
  await outside.click();
  await expect(page.getByRole('button', { name: 'Point menu action', exact: true })).toHaveCount(0);
  await expect(outside).toBeFocused();
});

test('point menu keeps focus inside when its controlled owner rejects closing', async ({ page }) => {
  await page.goto('/?dropdown-open');
  await page.getByLabel('Accept dropdown state').uncheck();
  const opener = page.getByRole('button', { name: 'Point menu opener', exact: true });
  await opener.focus();
  await opener.press('Enter');
  const action = page.getByRole('button', { name: 'Point menu action', exact: true });
  await expect(action).toBeFocused();
  await action.press('Escape');
  await expect(action).toBeFocused();
});

test('mobile flipped search panel keeps long Russian option labels inside separate rows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await page.goto('/?dropdown-open#long-search');
  await page.addStyleTag({ content: 'html,body,*,*::before,*::after{box-sizing:border-box}' });
  const input = page.getByRole('combobox', { name: 'Населённый пункт' });
  await input.click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  const field = await input.evaluate(node => node.closest('[class*="SelectTrigger"]')!.parentElement!.getBoundingClientRect().top);
  const panel = await list.boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(field + 2);
  const rows = await page.getByRole('option').evaluateAll(options => options.map(option => {
    const row = option.getBoundingClientRect();
    const label = option.querySelector('[class*="OptionLabel"]')!;
    const range = document.createRange();
    range.selectNodeContents(label);
    const text = range.getBoundingClientRect();
    return { top: row.top, bottom: row.bottom, textTop: text.top, textBottom: text.bottom, lines: range.getClientRects().length };
  }));
  expect(rows.some(row => row.lines > 1)).toBe(true);
  for (const [index, row] of rows.entries()) {
    expect(row.textTop).toBeGreaterThanOrEqual(row.top - 1);
    expect(row.textBottom).toBeLessThanOrEqual(row.bottom + 1);
    if (index) expect(row.textTop).toBeGreaterThanOrEqual(rows[index - 1].textBottom);
  }
  expect(await list.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('long-russian-search-mobile.png') });
});
