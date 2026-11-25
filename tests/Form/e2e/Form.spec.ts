import { expect, test } from '@playwright/test';

test('message Enter and button share admission; failure and late edits keep files', async ({ page }) => {
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Form message', exact: true });
  const send = page.getByRole('button', { name: 'Submit message' });
  await expect(text).toBeEnabled();
  await text.fill('first');
  await page.getByLabel('Form attachments').setInputFiles({
    name: 'same.txt', mimeType: 'text/plain', buffer: Buffer.from('first'),
  });
  await text.press('Enter');
  await expect(send).toBeDisabled();
  await text.press('Enter');
  await expect(page.getByTestId('form-calls')).toHaveText('1');
  await text.fill('later');
  await page.getByLabel('Form attachments').setInputFiles({
    name: 'same.txt', mimeType: 'text/plain', buffer: Buffer.from('later'),
  });
  await page.getByRole('button', { name: 'Confirm message' }).click();
  await expect(text).toHaveValue('later');
  await expect(page.getByTestId('form-files')).toHaveText('same.txt');
  await send.click();
  await page.getByRole('button', { name: 'Reject message' }).click();
  await expect(page.getByTestId('form-error')).toHaveText('Send rejected');
  await expect(text).toHaveValue('later');
  await expect(page.getByTestId('form-files')).toHaveText('same.txt');
  await send.click();
  await page.getByRole('button', { name: 'Confirm message' }).click();
  await expect(text).toHaveValue('');
  await expect(page.getByTestId('form-files')).toBeEmpty();
  await expect(page.getByTestId('form-calls')).toHaveText('3');
});

test('room and owner switch isolate drafts and old settlements; only text survives reload', async ({ page }) => {
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Form message', exact: true });
  await expect(text).toBeEnabled();
  await text.fill('room-a draft');
  await text.press('Enter');
  await page.getByRole('button', { name: 'Switch room' }).click();
  await expect(text).toHaveValue('');
  await text.fill('room-b draft');
  await expect(page.getByRole('button', { name: 'Submit message' })).toBeDisabled();
  await page.getByRole('button', { name: 'Confirm message' }).click();
  await expect(text).toHaveValue('room-b draft');
  await page.getByRole('button', { name: 'Switch room' }).click();
  await expect(text).toHaveValue('');
  await text.fill('persist me');
  await page.getByLabel('Form attachments').setInputFiles({
    name: 'ephemeral.txt', mimeType: 'text/plain', buffer: Buffer.from('file'),
  });
  await page.getByRole('button', { name: 'Switch owner' }).click();
  await expect(text).toHaveValue('');
  await expect(page.getByTestId('form-files')).toBeEmpty();
  await page.reload();
  await expect(text).toHaveValue('persist me');
  await expect(page.getByTestId('form-files')).toBeEmpty();
});

test('edit form validates, keeps later edits, and binds the nearest context', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('textbox', { name: 'Edit title' });
  const note = page.getByRole('textbox', { name: 'Edit note' });
  const nested = page.getByRole('textbox', { name: 'Nested title' });
  const save = page.getByRole('button', { name: 'Save edit' });
  await title.fill('');
  await expect(save).toBeDisabled();
  await title.fill('changed');
  await nested.fill('independent');
  await expect(title).toHaveValue('changed');
  await save.click();
  await note.fill('late note');
  await page.getByRole('button', { name: 'Confirm edit' }).click();
  await expect(title).toHaveValue('CHANGED');
  await expect(note).toHaveValue('late note');
  await expect(nested).toHaveValue('independent');
  await expect(page.getByTestId('edit-calls')).toHaveText('1');
  await expect(page.getByTestId('edit-dirty')).toHaveText('true');
  await page.getByRole('button', { name: 'Reset edit' }).click();
  await expect(note).toHaveValue('Note');
  await expect(page.getByTestId('edit-dirty')).toHaveText('false');
  await page.getByRole('button', { name: 'Clear edit' }).click();
  await expect(title).toHaveValue('Original');
});


test('StrictMode shared surfaces reject duplicate submit, acknowledge unmount and preserve edited-back text', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('textbox', { name: 'First surface text' });
  const second = page.getByRole('textbox', { name: 'Second surface text' });
  const secondSend = page.getByRole('button', { name: 'Second surface send' });
  await expect(first).toBeEnabled();
  await first.fill('shared');
  await expect(second).toHaveValue('shared');
  await first.press('Enter');
  await expect(secondSend).toBeDisabled();
  await second.press('Enter');
  await expect(page.getByTestId('shared-calls')).toHaveText('1');
  await page.getByRole('button', { name: 'Toggle first surface' }).click();
  await page.getByRole('button', { name: 'Confirm shared message' }).click();
  await expect(second).toHaveValue('');

  await page.getByRole('button', { name: 'Toggle first surface' }).click();
  await first.fill('same');
  await first.press('Enter');
  await second.fill('other');
  await second.fill('same');
  await page.getByRole('button', { name: 'Toggle first surface' }).click();
  await page.getByRole('button', { name: 'Confirm shared message' }).click();
  await expect(second).toHaveValue('same');
  await expect(page.getByTestId('shared-calls')).toHaveText('2');
  await expect(secondSend).toBeEnabled();
});


test('persistent subscription uses the latest committed initial values', async ({ page }) => {
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Subscription text' });
  await expect(text).toHaveValue('Initial');
  await text.fill('Persisted');
  await page.getByRole('button', { name: 'Change subscription default' }).click();
  await expect(text).toHaveValue('Persisted');
  await page.getByRole('button', { name: 'Remove subscription text' }).click();
  await expect(text).toHaveValue('Latest');
});

test('named choice and file primitives bind the nearest form and reset', async ({ page }) => {
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: 'Named checkbox' });
  await checkbox.check();
  await page.getByLabel('Named category').click();
  await page.getByText('Alpha', { exact: true }).last().click();
  await page.getByLabel('Named files').setInputFiles({
    name: 'named.txt', mimeType: 'text/plain', buffer: Buffer.from('file'),
  });
  await expect(page.getByTestId('named-values')).toContainText('"enabled":true');
  await expect(page.getByTestId('named-values')).toContainText('"category":"a"');
  await expect(page.getByTestId('named-values')).toContainText('"files":["named.txt"]');
  await page.getByRole('button', { name: 'Reset named fields' }).click();
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByTestId('named-values')).toHaveText('{"enabled":false,"category":null,"tags":[],"files":[]}');
  await expect(page.getByLabel('Named files')).toHaveValue('');
});


test('form-owned submit button respects native onSubmit and its cancellation', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('textbox', { name: 'Edit title' });
  const save = page.getByRole('button', { name: 'Save edit' });
  await title.fill('changed');
  await page.getByRole('button', { name: 'Toggle edit submit guard' }).click();
  await save.click();
  await expect(page.getByTestId('native-edit-submits')).toHaveText('1');
  await expect(page.getByTestId('edit-calls')).toHaveText('0');
  await page.getByRole('button', { name: 'Toggle edit submit guard' }).click();
  await save.click();
  await expect(page.getByTestId('native-edit-submits')).toHaveText('2');
  await expect(page.getByTestId('edit-calls')).toHaveText('1');
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Confirm edit' }).click();
  await expect(title).toHaveValue('CHANGED');
});


test('captured field updates cannot run after the same form becomes disabled', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Capture named update' }).click();
  await page.getByRole('button', { name: 'Toggle named disabled' }).click();
  await page.getByRole('button', { name: 'Invoke captured named update' }).click();
  await expect(page.getByTestId('named-updates')).toHaveText('0');
  await expect(page.getByRole('checkbox', { name: 'Named checkbox' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Toggle named disabled' }).click();
  await page.getByRole('button', { name: 'Invoke captured named update' }).click();
  await expect(page.getByTestId('named-updates')).toHaveText('1');
  await expect(page.getByRole('checkbox', { name: 'Named checkbox' })).toBeChecked();
});


test('action key changes suppress local stale settlement without releasing admission early', async ({ page }) => {
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start keyed action' });
  await start.click();
  await page.getByRole('button', { name: 'Switch action key' }).click();
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel keyed action' }).click();
  await expect(page.getByTestId('keyed-action-cancelled')).toHaveText('0');
  await page.getByRole('button', { name: 'Switch action key' }).click();
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel keyed action' }).click();
  await expect(page.getByTestId('keyed-action-cancelled')).toHaveText('0');
  await page.getByRole('button', { name: 'Resolve keyed action' }).click();
  await expect(start).toBeEnabled();
  await expect(page.getByTestId('keyed-action-settled')).toHaveText('0');
  await expect(page.getByTestId('keyed-action-success')).toHaveText('0');
  await start.click();
  await page.getByRole('button', { name: 'Cancel keyed action' }).click();
  await expect(page.getByTestId('keyed-action-cancelled')).toHaveText('1');
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: 'Resolve keyed action' }).click();
  await expect(page.getByTestId('keyed-action-settled')).toHaveText('1');
  await expect(page.getByTestId('keyed-action-success')).toHaveText('1');
});


test('replacing the storage adapter does not acknowledge an old submission into a new binding', async ({ page }) => {
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Storage binding text' });
  const submit = page.getByRole('button', { name: 'Submit storage binding' });
  const swap = page.getByRole('button', { name: 'Switch storage adapter' });
  const confirm = page.getByRole('button', { name: 'Confirm storage binding' });
  await expect(text).toHaveValue('draft A');
  await submit.click();
  await swap.click();
  await expect(text).toHaveValue('draft B');
  await expect(submit).toBeDisabled();
  await swap.click();
  await expect(text).toHaveValue('draft A');
  await confirm.click();
  await expect(submit).toBeEnabled();
  await expect(text).toHaveValue('draft A');
  await expect(page.getByTestId('storage-binding-success')).toHaveText('0');
  await submit.click();
  await confirm.click();
  await expect(text).toHaveValue('');
  await expect(page.getByTestId('storage-binding-success')).toHaveText('1');
});


test('empty persistence keeps target drafts in memory and acknowledges only the submitted target', async ({ page }) => {
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Memory draft' });
  const change = page.getByRole('button', { name: 'Switch memory target' });
  await text.fill('original A');
  await change.click();
  await text.fill('draft B');
  await change.click();
  await expect(text).toHaveValue('original A');
  await expect(page.getByTestId('memory-unsaved')).toHaveText('true');
  await page.getByRole('button', { name: 'Submit memory draft' }).click();
  await change.click();
  await page.getByRole('button', { name: 'Confirm memory draft' }).click();
  await expect(text).toHaveValue('draft B');
  await change.click();
  await expect(text).toHaveValue('');
  await change.click();
  await expect(text).toHaveValue('draft B');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes('memory-owner')))).toEqual([]);
  await page.reload();
  await change.click();
  await expect(text).toHaveValue('');
});


test('confirmed retry acknowledges only the original submission and is idempotent', async ({ page }) => {
  await page.goto('/');
  const scope = page.getByRole('region', { name: 'Retry draft fixture' });
  const text = scope.getByRole('textbox', { name: 'Retry draft text' });
  const files = scope.getByLabel('Retry attachments');
  await text.fill('original');
  await files.setInputFiles({ name: 'original.txt', mimeType: 'text/plain', buffer: Buffer.from('original') });
  await scope.getByRole('button', { name: 'Submit retry draft' }).click();
  await expect(scope.getByTestId('retry-draft-error')).toHaveText('Reply lost');
  await text.fill('edited');
  await files.setInputFiles({ name: 'later.txt', mimeType: 'text/plain', buffer: Buffer.from('later') });
  await scope.getByRole('button', { name: 'Confirm retry draft' }).click();
  await expect(text).toHaveValue('edited');
  await expect(scope.getByTestId('retry-draft-files')).toHaveText('later.txt');
  await text.fill('another edit');
  await scope.getByRole('button', { name: 'Confirm retry draft' }).click();
  await expect(text).toHaveValue('another edit');
  await expect(scope.getByTestId('retry-draft-files')).toHaveText('later.txt');
});


test('onChange receives a detached snapshot for local edits only', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: 'Form change callback' });
  const input = region.getByRole('textbox', { name: 'Change callback value' });
  await region.getByRole('button', { name: 'Receive change callback' }).click();
  await expect(input).toHaveValue('server');
  await expect(region.getByTestId('change-callback-count')).toHaveText('0');
  await input.fill('local');
  await expect(region.getByTestId('change-callback-count')).toHaveText('1');
  await expect(region.getByTestId('change-callback-last')).toHaveText('value:local');
  await expect(region.getByTestId('change-callback-value')).toHaveText('local');
  await region.getByRole('button', { name: 'Reset change callback' }).click();
  await expect(input).toHaveValue('server');
  await expect(region.getByTestId('change-callback-count')).toHaveText('1');
});
