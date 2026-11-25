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


test('coarse pointer tap opens hover menu once and outside tap dismisses it', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    try {
        const page = await context.newPage();
        await page.goto('/?dropdown-open');
        const trigger = page.getByRole('button', { name: 'Hover popup trigger' });
        const menu = page.getByRole('menu', { name: 'Hover popup actions' });
        await trigger.tap();
        await expect(menu).toBeVisible();
        await page.getByRole('button', { name: 'Outside point menu' }).tap();
        await expect(menu).not.toBeVisible();
    } finally {
        await context.close();
    }
});

test('context menu exposes the actual controlled surface and restores focus', async ({ page }) => {
    await page.goto('/?dropdown-open');
    const trigger = page.getByLabel('Context popup trigger');
    await trigger.focus();
    await trigger.press('Shift+F10');
    const menu = page.getByRole('menu', { name: 'Context popup actions' });
    await expect(menu).toBeVisible();
    const id = await menu.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(trigger).toHaveAttribute('aria-controls', id!);
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
});


test('nested portal escape dismisses only the top popup in the logical menu stack', async ({ page }) => {
    await page.goto('/?dropdown-open');
    const outerTrigger = page.getByRole('button', { name: 'Wide dropdown anchor' });
    const outer = page.getByTestId('narrow-dropdown-surface');
    const nestedTrigger = page.getByRole('button', { name: 'Nested narrow dropdown' });
    const nested = page.getByTestId('nested-narrow-surface');

    await outerTrigger.click();
    await expect(outer).toBeVisible();
    await nestedTrigger.click();
    await expect(nested).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(nested).not.toBeVisible();
    await expect(outer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(outer).not.toBeVisible();
});
