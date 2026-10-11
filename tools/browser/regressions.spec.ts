import { expect, test, type Page } from '@playwright/test';

async function openFixture(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Delba UI browser regression fixture' })).toBeVisible();
}

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

test('named timing resolves theme values for observer and CSS cascades', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Named motion timing' });
  // Read current theme values on entry, rather than freezing defaults during render.
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
  await expect(loadChildren.first()).toHaveCSS('animation-delay', '0.1s');
  await expect(loadChildren.nth(1)).toHaveCSS('animation-delay', '0.12s');
  await expect(children.first()).toHaveAttribute('data-reveal-state', 'done');
  await expect(children.nth(1)).toHaveAttribute('data-reveal-state', 'done');
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
  const countBefore = await page.evaluate(() => window.__phoneCountryOptionCount);
  expect(countBefore).toBeGreaterThan(200);
  const samplesBefore = await page.evaluate(() => window.__phoneProfileSamples.length);
  await phone.pressSequentially('4155552671');
  await expect(phone).toHaveValue(/\+7/);
  await expect.poll(() => page.evaluate(() => window.__phoneProfileSamples.length)).toBeGreaterThan(samplesBefore + 5);
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

  await page.evaluate(() => window.__setSwapKey?.('second'));
  await expect(box).toHaveClass(/ui-anim-fadeOutDown/);
  await expect(flex).toHaveClass(/ui-anim-fadeOutDown/);
  await expect(box).toHaveText('Box first');
  await expect(flex).toHaveText('Flex first');
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
  await expect(page.locator('[aria-label="Portal select modal"]').locator('xpath=ancestor::*[@aria-hidden="true"]')).toHaveCount(1);
  await expect(opener).toBeFocused();
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
  await expect(topRoot).toHaveAttribute('aria-hidden', 'true');
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
