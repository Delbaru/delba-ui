import { expect, test } from '@playwright/test';

test('accordion animates layout padding and borders all the way to zero', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Padded answer', exact: true });
  const panel = page.locator('.fixture-accordion-panel');
  // Capture the real WAAPI effect when it is created: after click() returns, a
  // short completed animation may already have been removed from getAnimations().
  await panel.evaluate(element => {
    const target = element as HTMLElement & { collapseFrames?: ComputedKeyframe[] };
    const ownAnimate = Object.getOwnPropertyDescriptor(target, 'animate');
    const animate = target.animate;
    target.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (animation.id === 'ui-collapse') {
        target.collapseFrames = animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
        if (ownAnimate) Object.defineProperty(target, 'animate', ownAnimate);
        else Reflect.deleteProperty(target, 'animate');
      }
      return animation;
    };
  });
  await trigger.click();
  const target = await panel.evaluate(element =>
    (element as HTMLElement & { collapseFrames?: ComputedKeyframe[] }).collapseFrames?.at(-1));
  expect(target).toMatchObject({ height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px' });
  await expect(page.locator('.fixture-accordion-panel').locator('xpath=../..')).toHaveAttribute('hidden', /.*/);
  await trigger.click();
  await expect(page.locator('.fixture-accordion-panel')).toBeVisible();
  await expect.poll(() => page.locator('.fixture-accordion-panel').evaluate((panel) => getComputedStyle(panel).paddingBottom)).toBe('28px');
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`direct Input commands await DOM and survive reversals (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => Boolean(window.__collapseCommands))).toBe(true);
    const field = page.getByRole('textbox', { name: 'Command field', exact: true });
    await expect(field).toHaveCount(0);
    await expect(page.getByText('Command field description', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => window.__collapseCommands.showAndFocus())).toEqual({
      status: 'finished', focused: true, settled: true,
    });
    await expect(field).toBeVisible();
    const native = await field.elementHandle();
    expect(await page.evaluate(async () => {
      const handle = window.__collapseCommands.panel;
      const first = handle?.hide();
      const second = handle?.show();
      return Promise.all([first, second]);
    })).toEqual([{ status: 'interrupted' }, { status: 'finished' }]);
    await expect(field).toBeVisible();
    expect(await field.evaluate((node, original) => node === original, native)).toBe(true);
    expect(await page.evaluate(() => window.__collapseCommands.panel?.hide())).toEqual({ status: 'finished' });
    await expect(field).toHaveCount(0);
    expect(await page.evaluate(async () => {
      const handle = window.__collapseCommands.panel;
      return Promise.all([handle?.show(), handle?.hide()]);
    })).toEqual([{ status: 'interrupted' }, { status: 'finished' }]);
    await expect(field).toHaveCount(0);
    expect(await page.evaluate(async () => {
      const handle = window.__collapseCommands.panel;
      return Promise.all([handle?.show(), handle?.show()]);
    })).toEqual([{ status: 'finished' }, { status: 'finished' }]);
    expect(await page.evaluate(async () => {
      const handle = window.__collapseCommands.panel;
      return Promise.all([handle?.toggle(), handle?.toggle()]);
    })).toEqual([{ status: 'interrupted' }, { status: 'finished' }]);
    await expect(field).toBeVisible();
    await expect(page.getByTestId('appear-ends')).toHaveText('1');
  });
}

test('controlled commands respect their owner; retained content supports browser search', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__collapseCommands))).toBe(true);
  expect(await page.evaluate(() => window.__collapseCommands.controlled?.show())).toEqual({ status: 'finished' });
  await expect(page.getByRole('textbox', { name: 'Controlled command field' })).toBeVisible();
  await page.evaluate(() => window.__collapseCommands.accept(false));
  expect(await page.evaluate(() => window.__collapseCommands.controlled?.hide())).toEqual({ status: 'interrupted' });
  await expect(page.getByRole('textbox', { name: 'Controlled command field' })).toBeVisible();
  expect(await page.evaluate(() => window.__collapseCommands.readonly?.show())).toEqual({ status: 'interrupted' });
  const readonly = page.getByRole('textbox', { name: 'Readonly command field', includeHidden: true });
  await expect(readonly).toBeHidden();
  const readonlyWrap = readonly.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," ui-collapse ")][1]');
  await readonlyWrap.evaluate((node) => {
    node.dispatchEvent(new Event('beforematch'));
    node.removeAttribute('hidden');
  });
  await expect(readonlyWrap).toHaveAttribute('hidden', 'until-found');
  await expect(readonlyWrap).not.toHaveAttribute('data-open');
  expect(await page.evaluate(() => window.__collapseCommands.readonly?.open)).toBe(false);
  const text = page.getByText('Retained command text', { exact: true });
  await expect(text).toBeHidden();
  expect(await page.evaluate(() => window.__collapseCommands.text?.show())).toEqual({ status: 'finished' });
  await expect(text).toBeVisible();
  expect(await page.evaluate(() => window.__collapseCommands.text?.hide())).toEqual({ status: 'finished' });
  await expect(text).toBeHidden();
  const wrap = text.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," ui-collapse ")][1]');
  await expect(wrap).toHaveAttribute('hidden', /.*/);
  await wrap.dispatchEvent('beforematch');
  await expect(text).toBeVisible();
  expect(await page.evaluate(() => window.__collapseCommands.text?.open)).toBe(true);
  await page.evaluate(() => window.__collapseCommands.updateText('Updated retained text'));
  await expect(page.getByText('Updated retained text', { exact: true })).toBeVisible();
  await page.evaluate(() => window.__collapseCommands.updateText(''));
  await expect(page.getByText('Updated retained text', { exact: true })).toBeVisible();
});

test('uncontrolled root collapse closes portalled Dropdown and Select panels', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__collapseCommands))).toBe(true);
  await page.evaluate(() => window.__collapseCommands.dropdown?.show());
  const dropdown = page.getByRole('button', { name: 'Root dropdown', exact: true });
  await dropdown.click();
  await expect(page.getByText('Root portal content', { exact: true })).toBeVisible();
  expect(await page.evaluate(async () => {
    await window.__collapseCommands.dropdown?.hide();
    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="root-dropdown-trigger"]');
    const wrap = trigger?.closest('.ui-collapse');
    return wrap?.hasAttribute('hidden');
  })).toBe(true);
  await expect(page.getByText('Root portal content', { exact: true })).toBeHidden();
  await page.evaluate(() => window.__collapseCommands.dropdown?.show());
  await expect(dropdown).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Root portal content', { exact: true })).toBeHidden();
  await page.evaluate(() => window.__collapseCommands.select?.show());
  await page.getByRole('button', { name: 'Collapsed select' }).click();
  await expect(page.getByRole('option', { name: 'Root one' })).toBeVisible();
  await page.evaluate(() => window.__collapseCommands.select?.hide());
  await expect(page.getByRole('option', { name: 'Root one' })).toBeHidden();
  await page.evaluate(() => window.__collapseCommands.select?.show());
  await expect(page.getByRole('option', { name: 'Root one' })).toBeHidden();
});

test('cancelled motion resolves as interrupted and a repeated command can finish', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__collapseCommands))).toBe(true);
  expect(await page.evaluate(async () => {
    const handle = window.__collapseCommands.panel;
    const previous = handle?.transition;
    const opening = handle?.show();
    while (handle?.transition === previous) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    handle?.transition.cancel();
    return opening;
  })).toEqual({ status: 'interrupted' });
  expect(await page.evaluate(() => window.__collapseCommands.showAndFocus())).toEqual({
    status: 'finished', focused: true, settled: true,
  });
  expect(await page.evaluate(async () => {
    const api = window.__collapseCommands;
    const handle = api.controlled;
    const previous = handle?.transition;
    api.setControlledOpen(true);
    while (handle?.transition === previous) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const joined = handle?.show();
    handle?.transition.cancel();
    return joined;
  })).toEqual({ status: 'interrupted' });
});

test('unmount interrupts pending commands and cleans up behavior and DOM refs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(window.__collapseCommands))).toBe(true);
  const result = await page.evaluate(async () => {
    const api = window.__collapseCommands;
    const handle = api.panel;
    const before = api.cleanups;
    const opening = handle?.show();
    api.drop();
    const status = await opening;
    return { status, next: await handle?.show(), cleaned: api.cleanups > before, panel: api.panel, input: api.input };
  });
  expect(result).toEqual({
    status: { status: 'interrupted' }, next: { status: 'interrupted' }, cleaned: true, panel: null, input: null,
  });
});
