import { expect, test } from '@playwright/test';

test('public popup closes on collapse and on mechanism removal without reopening', async ({ page }) => {
    await page.goto('/?dropdown-open');
    const trigger = page.getByRole('button', { name: 'Popup menu trigger' });
    const menu = page.getByRole('menu', { name: 'Popup door actions' });
    const toggleSurface = page.getByRole('button', { name: 'Toggle popup surface' });
    const toggleMechanism = page.getByRole('button', { name: 'Toggle popup mechanism' });

    await trigger.focus();
    await trigger.press('ArrowDown');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(menu).toBeVisible();
    // No outside pointer event: the mechanism itself must close.
    await toggleSurface.evaluate((node: HTMLButtonElement) => node.click());
    await expect(menu).not.toBeVisible();
    await toggleSurface.click();
    await expect(trigger).toBeVisible();
    await expect(menu).not.toBeVisible();

    await trigger.click();
    await expect(menu).toBeVisible();
    await toggleMechanism.evaluate((node: HTMLButtonElement) => node.click());
    await expect(menu).not.toBeVisible();
    await toggleMechanism.click();
    await expect(menu).not.toBeVisible();
});
