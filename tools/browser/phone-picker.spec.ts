import { expect, test } from '@playwright/test';

test('all-country PhoneField mounts its picker on demand and cleans it up after exit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Delba UI browser regression fixture' })).toBeVisible();

  const phone = page.getByRole('textbox', { name: 'Profile phone field' });
  const initialInput = await phone.elementHandle();
  expect(initialInput).not.toBeNull();
  const countryOptions = page.locator('[aria-label="Страны"] button');
  await expect.poll(() => countryOptions.count()).toBe(0);

  const trigger = page.getByRole('button', { name: /Страна: Россия/ }).last();
  await trigger.click();
  const picker = page.getByRole('dialog', { name: 'Выберите страну' });
  const search = page.getByRole('textbox', { name: 'Поиск стран' });
  await expect(picker).toBeVisible();
  await expect(search).toBeFocused();
  await expect.poll(() => countryOptions.count()).toBeGreaterThan(200);
  expect(await phone.evaluate((node, original) => node === original, initialInput)).toBe(true);

  await search.fill('Канада');
  await expect(picker.getByRole('button', { name: /Канада \(CA\)/ })).toBeVisible();
  await page.keyboard.press('Escape');
  // Dismissal keeps the current search; the exiting panel is removed after motion ends.
  expect(await countryOptions.count()).toBeGreaterThan(0);
  await expect(picker).toBeHidden();
  await expect.poll(() => countryOptions.count()).toBe(0);

  await trigger.click();
  await expect(picker).toBeVisible();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('Канада');
  await picker.getByRole('button', { name: /Канада \(CA\)/ }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: /Страна: Канада \(CA\)/ })).toBeVisible();
  await expect.poll(() => countryOptions.count()).toBe(0);

  await page.getByRole('button', { name: /Страна: Канада \(CA\)/ }).click();
  await expect(picker).toBeVisible();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await expect(picker.getByRole('button', { name: /Канада \(CA\)/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await phone.evaluate((node, original) => node === original, initialInput)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect.poll(() => countryOptions.count()).toBe(0);
});
