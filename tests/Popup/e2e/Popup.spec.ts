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


test('context popup supports right-click and touch long-press without stealing scroll gestures', async ({ page }) => {
    await page.goto('/?dropdown-open');
    const trigger = page.getByLabel('Context popup trigger');
    const menuItem = page.getByRole('menuitem', { name: 'Context popup action' });

    await trigger.click({ button: 'right' });
    await expect(menuItem).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menuItem).toBeHidden();

    const pointer = async (type: string, x: number, y: number) => page.evaluate(({ type, x, y }) => {
        const target = document.querySelector('[aria-label="Context popup trigger"]');
        target?.dispatchEvent(new PointerEvent(type, {
            bubbles: true, pointerId: 17, pointerType: 'touch', isPrimary: true,
            button: 0, clientX: x, clientY: y,
        }));
    }, { type, x, y });

    await pointer('pointerdown', 80, 90);
    await pointer('pointermove', 100, 90);
    await pointer('pointerup', 100, 90);
    await page.waitForTimeout(550);
    await expect(menuItem).toHaveCount(0);

    await pointer('pointerdown', 80, 90);
    await page.waitForTimeout(550);
    await pointer('pointerup', 80, 90);
    await expect(menuItem).toBeVisible();
});

test('repeated context menus keep the actual boundary host after readers state changes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?dropdown-open');
    const trigger = page.getByLabel('Context popup trigger');
    const menu = page.getByRole('menu', { name: 'Context popup actions' });
    for (const readers of ['true', 'false', 'true']) {
        await trigger.click({ button: 'right', position: { x: 12, y: 8 } });
        await expect(menu).toBeVisible();
        await menu.getByRole('menuitem', { name: 'Toggle context readers' }).click();
        await expect(menu).toBeHidden();
        await expect(trigger).toHaveAttribute('data-readers', readers);
    }
    await trigger.click({ button: 'right', position: { x: 20, y: 10 } });
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-controls', (await menu.getAttribute('id'))!);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
});
