import { expect, test } from '@playwright/test';

test('server HTML hydrates without replacing controls or breaking collapse', async ({ page, request }) => {
  const response = await request.get('/ssr');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('Иван');
  expect(html).toContain('Текст из CMS');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('data-reveal="up"');
  expect(html).toContain('--reveal-delay:20ms');
  expect(html).toContain('data-reveal-start="load"');
  expect(html).toContain('--reveal-duration:var(--t-d-slow)');
  expect(html).toContain('--reveal-delay:var(--t-d-very-fast)');
  expect(html).not.toContain('animate="[object Object]"');
  expect(html).toContain('ui-counter-reserve');
  expect(html).toContain('125');

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
  });
  await page.goto('/ssr');
  await expect(page.getByRole('heading', { name: 'SSR and hydration' })).toBeVisible();
  const button = page.getByTestId('ssr-button');
  await expect(page.getByTestId('ssr-counter').locator('.ui-counter-value')).toHaveText('125%');
  await expect(page.locator('dl[data-testid="ssr-requisites"] dt')).toHaveText('ИНН');
  await expect(page.locator('dl[data-testid="ssr-requisites"] dd')).toHaveText('1234567890');
  await button.click();
  await expect(page.getByRole('textbox', { name: 'Closed field' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Closed field' })).not.toHaveAttribute('inert');
  await expect.poll(() => page.evaluate(() => ({
    inputPreserved: document.querySelector('[data-testid="ssr-input"]') === window.__ssrInput,
    buttonPreserved: document.querySelector('[data-testid="ssr-button"]') === window.__ssrButton,
    hydrationErrors: window.__hydrationErrors,
  }))).toEqual({ inputPreserved: true, buttonPreserved: true, hydrationErrors: [] });
  expect(errors).toEqual([]);
});
