import { expect, test, type Page } from '@playwright/test';

async function openContent(page: Page) {
  await page.goto('/?content');
  await expect(page.getByRole('heading', { name: 'Delba UI content contracts' })).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'Rich document' });
  await expect(editor).toHaveText('Initial document');
  await expect(page.getByTestId('editor-change-count')).toHaveText('0');
  return editor;
}

test('direct toast routes to the mounted queue and does not retain messages after unmount', async ({ page }) => {
  await openContent(page);
  await page.getByRole('button', { name: 'Show direct message', exact: true }).click();
  await expect(page.getByTestId('direct-toast-accepted')).toHaveText('true');
  await expect(page.locator('.ToastProvider .ToastCard')).toHaveCount(1);
  await expect(page.locator('.ToastCard')).toContainText('Direct command result');
  await page.getByRole('button', { name: 'Toggle content contracts' }).click();
  await expect(page.locator('.ToastProvider')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show direct message', exact: true }).click();
  await expect(page.getByTestId('direct-toast-accepted')).toHaveText('false');
  await page.getByRole('button', { name: 'Toggle content contracts' }).click();
  await expect(page.getByRole('textbox', { name: 'Rich document' })).toBeVisible();
  await expect(page.locator('.ToastProvider')).toHaveCount(0);
});

test('StrictMode effect-created notifications retain their expiry after replay cleanup', async ({ page }) => {
  await openContent(page);
  await page.getByRole('button', { name: 'Toggle automatic notification' }).click();
  await expect(page.locator('.ToastCard')).toContainText('Effect-created message');
  await expect(page.locator('.ToastCard')).toHaveCount(0);
});

test('synchronous batch evictions release never-entered cards from queue state', async ({ page }) => {
  await openContent(page);
  await page.getByRole('button', { name: 'Batch eviction probe' }).click();
  await expect(page.getByTestId('toast-owned-items')).toHaveText('5');
  await page.getByRole('button', { name: 'Batch eviction probe' }).click();
  await expect(page.getByTestId('toast-owned-items')).toHaveText('5');
});

test('rich editor keeps initial content in StrictMode, accepts input and undoes it', async ({ page }) => {
  const editor = await openContent(page);
  await editor.click();
  await editor.press('ControlOrMeta+End');
  await editor.pressSequentially(' added');
  await expect(editor).toHaveText('Initial document added');
  await expect(page.getByTestId('editor-snapshot')).toContainText('Initial document added');
  // Lexical groups typing by elapsed time; keyboard input may create several valid entries.
  const original = 'Initial document';
  const edited = 'Initial document added';
  let undoCount = 0;
  while (await editor.textContent() !== original && undoCount < ' added'.length) {
    const before = await editor.textContent();
    await editor.press('ControlOrMeta+z');
    await expect.poll(() => editor.textContent()).not.toBe(before);
    expect((await editor.textContent())?.startsWith(original)).toBe(true);
    undoCount += 1;
  }
  expect(undoCount).toBeGreaterThan(0);
  await expect(editor).toHaveText(original);

  for (let index = 0; index < undoCount; index += 1) {
    const before = await editor.textContent();
    await editor.press('ControlOrMeta+Shift+z');
    await expect.poll(() => editor.textContent()).not.toBe(before);
  }
  await expect(editor).toHaveText(edited);
  await expect(page.getByTestId('editor-snapshot')).toContainText(edited);
});

test('rich toolbar preserves selection and applies formatting without another editor value', async ({ page }) => {
  const editor = await openContent(page);
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Жирный', exact: true }).click();
  await expect(editor.locator('strong, b')).toContainText('Initial document');
  await expect(page.getByRole('button', { name: 'Жирный', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('editor-snapshot')).toContainText('Initial document');
});

test('external sync does not report a user change; imperative commands do', async ({ page }) => {
  const editor = await openContent(page);
  await editor.click();
  await editor.press('ControlOrMeta+End');
  await editor.pressSequentially(' edited');
  await expect(editor).toContainText(' edited');
  const before = await page.getByTestId('editor-change-count').textContent();
  await page.getByRole('button', { name: 'Replace external document' }).click();
  await expect(editor).toHaveText('Externally replaced document');
  await expect(page.getByTestId('editor-change-count')).toHaveText(before ?? '');
  await page.getByRole('button', { name: 'Set editor document', exact: true }).click();
  await expect(editor).toHaveText('Imperative document');
  await expect(page.getByTestId('editor-change-count')).not.toHaveText(before ?? '');
  await page.getByRole('button', { name: 'Reset editor document' }).click();
  await expect(editor).toHaveText('Externally replaced document');
});

test('variable tokens retain their own DOM marker and remove through their actual pointer action', async ({ page }) => {
  const editor = await openContent(page);
  await page.getByRole('button', { name: 'Insert client variable' }).click();
  const chip = editor.locator('[data-variable-key="client"]');
  await expect(chip).toHaveText('Client name');
  await expect(chip).toHaveClass(/VariableNode/);
  await expect(page.getByTestId('editor-snapshot')).toContainText('variableKey');
  const bounds = await chip.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('Variable has no painted bounds');
  await chip.click({ position: { x: bounds.width - 1, y: bounds.height / 2 } });
  await expect(chip).toHaveCount(0);
  await expect(page.getByTestId('editor-snapshot')).not.toContainText('variableKey');
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`toast queue limits open cards, completes exit and cleans its portal (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await openContent(page);
    await page.getByRole('button', { name: 'Show seven messages' }).click();
    const stack = page.locator('.ToastProvider[role="status"]');
    await expect(stack.locator('.ToastCard')).toHaveCount(5);
    await expect(stack).not.toContainText('Message 1');
    await expect(stack).not.toContainText('Message 2');
    await expect(stack).toContainText('Message 7');
    await page.getByRole('button', { name: 'Show short message' }).click();
    await expect(stack).toContainText('Short lived message');
    await expect(stack).not.toContainText('Short lived message');
    await page.getByRole('button', { name: 'Toggle content contracts' }).click();
    await expect(stack).toHaveCount(0);
  });

  test(`rich sequences measure unequal steps and settle on the selected content (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await openContent(page);
    const slide = page.getByTestId('rich-slide');
    const initialHeight = await slide.evaluate(node => node.getBoundingClientRect().height);
    await page.getByRole('button', { name: 'Change rich step' }).click();
    await expect.poll(() => slide.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThan(initialHeight + 1);
    const clip = page.getByTestId('rich-clip').locator('.RichTextSequence');
    await expect.poll(() => clip.locator(':scope > *').last().evaluate(node => getComputedStyle(node).opacity)).toBe('1');
    await expect(clip).toHaveCSS('clip-path', 'inset(0px)');
    await page.getByRole('button', { name: 'Toggle content contracts' }).click();
    await expect(slide).toHaveCount(0);
  });
}
