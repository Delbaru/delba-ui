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
