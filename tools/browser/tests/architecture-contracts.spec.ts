import { expect, test, type Page } from '@playwright/test';

async function openFixture(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Delba UI browser regression fixture' })).toBeVisible();
}

test('Input calendar validates once on outside pointer and Tab blur, while Escape cancels without commit', async ({ page }) => {
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Field engine event contracts' });
  const date = scope.getByRole('textbox', { name: 'Date validation field' });
  const calendar = page.getByRole('group', { name: 'Открыть календарь', exact: true });
  const validations = scope.getByTestId('field-date-validation-calls');
  const commits = scope.getByTestId('field-date-commits');

  await date.click();
  await expect(calendar).toBeVisible();
  await scope.getByRole('button', { name: 'Dismiss date popup by click' }).click();
  await expect(validations).toHaveText('1');
  await expect(commits).toHaveText('0');

  await scope.getByRole('button', { name: 'Reset date event counts' }).click();
  await date.click();
  await expect(calendar).toBeVisible();
  await date.press('Shift+Tab');
  await expect(scope.getByRole('button', { name: 'Previous focus target' })).toBeFocused();
  await expect(validations).toHaveText('1');
  await expect(commits).toHaveText('0');

  await scope.getByRole('button', { name: 'Reset date event counts' }).click();
  await date.click();
  await expect(calendar).toBeVisible();
  await date.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(validations).toHaveText('0');
  await expect(commits).toHaveText('0');
});

test('Input calendar selection commits once and Textarea preserves validation and callback ordering', async ({ page }) => {
  await openFixture(page);
  const scope = page.getByRole('region', { name: 'Field engine event contracts' });
  const date = scope.getByRole('textbox', { name: 'Date validation field' });
  await date.click();
  const calendar = page.getByRole('group', { name: 'Открыть календарь', exact: true });
  await expect(calendar).toBeVisible();
  await calendar.locator('[id$="-day-2025-0-16"]').click();
  await expect(calendar).toHaveCount(0);
  await expect(scope.getByTestId('field-date-validation-calls')).toHaveText('1');
  await expect(scope.getByTestId('field-date-commits')).toHaveText('1');

  const readOnly = scope.getByRole('textbox', { name: 'Read only validated textarea' });
  await readOnly.focus();
  await readOnly.press('Tab');
  await expect(scope.getByRole('button', { name: 'Leave read only textarea' })).toBeFocused();
  await expect(scope.getByTestId('field-readonly-validation-calls')).toHaveText('1');

  await scope.getByRole('textbox', { name: 'Textarea event order' }).fill('x');
  await expect(scope.getByTestId('field-textarea-event-order')).toHaveText('change>validate>value>');
});


test('Calendar day text uses its semantic colors without a base white override', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('region', { name: 'Field engine event contracts' }).getByRole('textbox', { name: 'Date validation field' }).click();
  const calendar = page.getByRole('group', { name: 'Открыть календарь', exact: true });
  const colors = await calendar.evaluate(root => {
    const probe = document.createElement('span');
    root.appendChild(probe);
    const token = (name: string) => {
      probe.style.color = 'var(' + name + ')';
      return getComputedStyle(probe).color;
    };
    const day = (date: number) => {
      const text = root.querySelector('[id$="-day-2025-0-' + date + '"] .Text');
      if (!text) throw new Error('Calendar day text missing: ' + date);
      return getComputedStyle(text).color;
    };
    const result = { normal: day(16), disabled: day(9), selected: day(15), weekend: day(18),
      text: token('--text'), muted: token('--text-muted'), white: token('--white-100'), error: token('--error') };
    probe.remove();
    return result;
  });
  expect(colors.normal).toBe(colors.text);
  expect(colors.disabled).toBe(colors.muted);
  expect(colors.selected).toBe(colors.white);
  expect(colors.weekend).toBe(colors.error);
});


test('time suffix stays behind typed input and inline errors hide both native text colors', async ({ page }) => {
  await openFixture(page);
  const time = page.getByRole('textbox', { name: 'Controlled refactor time', exact: true });
  await time.pressSequentially('1');
  await expect(time.locator('..').locator('input[aria-hidden="true"]')).toHaveCount(1);
  await expect(time).toHaveCSS('position', 'relative');
  await expect(time).toHaveCSS('z-index', '1');
  const mask = time.locator('..').locator('input[aria-hidden="true"]');
  const placeholderColor = await mask.evaluate(node => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--field-placeholder-color, var(--text-muted))';
    node.parentElement?.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(mask).toHaveCSS('color', placeholderColor);
  await expect(mask).toHaveCSS('-webkit-text-fill-color', placeholderColor);
  const field = page.getByRole('textbox', { name: 'Inline error value visibility', exact: true });
  await expect(field).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await expect(field).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)');
  await field.focus();
  await expect(field).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await expect(field).not.toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)');
});
