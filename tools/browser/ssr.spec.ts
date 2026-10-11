import { expect, test } from '@playwright/test';

test('server HTML hydrates without replacing controls or breaking collapse', async ({ page, request }) => {
  const response = await request.get('/ssr');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('Иван');
  expect(html).toContain('Текст из CMS');
  expect(html).toContain('aria-hidden="true"');

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/ssr');
  await expect(page.getByRole('heading', { name: 'SSR and hydration' })).toBeVisible();
  const button = page.getByTestId('ssr-button');
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
