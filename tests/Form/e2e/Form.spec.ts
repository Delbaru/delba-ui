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
  await checkbox.locator('xpath=ancestor::label').click();
  await expect(checkbox).toBeChecked();
  await page.getByLabel('Named category').click();
  await page.getByRole('option', { name: 'Alpha', exact: true }).click();
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


test('optional named primitives bind to the nearest form and reset with the owner', async ({ page }) => {
  await page.goto('/');
  const enabled = page.getByRole('checkbox', { name: 'Optional enabled' });
  const notifications = page.getByRole('checkbox', { name: 'Notifications' });
  const sms = page.getByRole('radio', { name: 'SMS' });
  await enabled.locator('xpath=ancestor::label').click();
  await expect(enabled).toBeChecked();
  await notifications.locator('xpath=ancestor::label').click();
  await expect(notifications).toBeChecked();
  await sms.locator('xpath=ancestor::label').click();
  await expect(sms).toBeChecked();
  await page.getByRole('button', { name: 'High', exact: true }).click();
  await page.getByRole('textbox', { name: 'Optional text' }).fill('text value');
  await page.getByRole('textbox', { name: 'Optional note' }).fill('note value');
  await page.getByRole('button', { name: 'Optional tags', exact: true }).click();
  await page.getByRole('option', { name: 'Beta' }).click();

  const values = () => page.getByTestId('named-values').textContent().then(text => JSON.parse(text ?? '{}'));
  expect(await values()).toMatchObject({
    optionalEnabled: true, notify: true, channel: 'sms', priority: 'high',
    optionalText: 'text value', optionalNote: 'note value', optionalTags: ['b'],
  });

  await page.getByRole('button', { name: 'Reset named fields' }).click();
  const reset = await values();
  for (const name of ['optionalEnabled', 'notify', 'optionalText', 'optionalNote', 'optionalTags', 'channel', 'priority']) {
    expect(reset).not.toHaveProperty(name);
  }
});

test('mapped server field errors invalidate the form until the field changes', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Server validation email' });
  const submit = page.getByRole('button', { name: 'Submit server validation' });
  await submit.click();

  await expect(page.getByTestId('server-validation-error')).toHaveText('Use a valid email address');
  await expect(page.getByTestId('server-validation-valid')).toHaveText('false');
  await expect(page.getByTestId('server-submit-attempts')).toHaveText('1');
  await expect(submit).toBeDisabled();

  await page.getByRole('button', { name: 'Force direct submit' }).click();
  await expect(page.getByTestId('server-submit-attempts')).toHaveText('1');

  await input.fill('person@example.com');
  await expect(page.getByTestId('server-validation-error')).toHaveText('');
  await expect(page.getByTestId('server-validation-valid')).toHaveText('true');
  await expect(submit).toBeEnabled();
});

test('standalone action controllers report failures and settle without success', async ({ page }) => {
  await page.goto('/');
  const fixture = page.getByRole('region', { name: 'Action failure fixture' });
  const button = fixture.getByRole('button', { name: 'Run failing action' });
  await button.click();

  await expect(fixture.getByTestId('action-failure-settled')).toHaveText('failed');
  await expect(fixture.getByTestId('action-failure-success')).toHaveText('0');
  await expect(page.getByTestId('action-provider-failures')).toHaveText('1');
  await expect(button).toBeEnabled();
});

test('confirmed refresh clears stale server validation and updates untouched fields', async ({ page }) => {
  await page.goto('/');
  const fixture = page.getByRole('region', { name: 'Server validation fixture' });
  const submit = fixture.getByRole('button', { name: 'Submit server validation' });
  await submit.click();
  await expect(submit).toBeDisabled();
  await fixture.getByRole('button', { name: 'Refresh confirmed email' }).click();
  await expect(fixture.getByRole('textbox', { name: 'Server validation email' })).toHaveValue('confirmed@example.com');
  await expect(fixture.getByTestId('server-validation-error')).toHaveText('');
  await expect(submit).toBeEnabled();
});

test('refresh conflicts stay visible until the field owner resolves them', async ({ page }) => {
  await page.goto('/');
  const fixture = page.getByRole('region', { name: 'Edit form pilot' });
  const title = fixture.getByRole('textbox', { name: 'Edit title' });
  const conflict = fixture.getByTestId('edit-title-conflict');
  await title.fill('Local title');
  await fixture.getByRole('button', { name: 'Refresh edit values' }).click();
  await expect(title).toHaveValue('Local title');
  await expect(fixture.getByRole('textbox', { name: 'Edit note' })).toHaveValue('Remote note');
  await expect(conflict).toHaveText('Remote title');
  await fixture.getByRole('button', { name: 'Refresh edit values' }).click();
  await expect(conflict).toHaveText('Remote title');
  await fixture.getByRole('button', { name: 'Accept remote edit title' }).click();
  await expect(title).toHaveValue('Remote title');
  await expect(conflict).toBeEmpty();
  await page.reload();
  await title.fill('Kept title');
  await fixture.getByRole('button', { name: 'Refresh edit values' }).click();
  await expect(conflict).toHaveText('Remote title');
  await fixture.getByRole('button', { name: 'Keep local edit title' }).click();
  await expect(title).toHaveValue('Kept title');
  await expect(conflict).toBeEmpty();
});

test('custom validation focuses the first editable field in its own scope', async ({ page }) => {
  await page.goto('/');
  const scope = page.getByRole('region', { name: 'Invalid form focus' });
  const title = scope.getByRole('textbox', { name: 'Invalid focus title', exact: true });
  const note = scope.getByRole('textbox', { name: 'Invalid focus note', exact: true });
  const submit = scope.getByRole('button', { name: 'Validate custom fields' });
  await submit.click();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute('aria-invalid', 'true');
  await expect(scope.getByTestId('invalid-focus-submits')).toHaveText('0');
  await title.fill('Valid title');
  await submit.click();
  await expect(note).toBeFocused();
  await note.fill('Valid note');
  await submit.click();
  const category = scope.getByRole('button', { name: 'Invalid focus category' });
  await expect(category).toBeFocused();
  await category.click();
  await page.getByRole('option', { name: 'Focus category one' }).click();
  await submit.click();
  await expect(scope.getByRole('button', { name: 'Focus Low' })).toBeFocused();
  await scope.getByRole('button', { name: 'Focus High' }).click();
  await submit.click();
  await expect(scope.getByTestId('invalid-focus-submits')).toHaveText('1');
});

test('native constraint validation keeps browser focus and does not submit an invalid form', async ({ page }) => {
  await page.goto('/');
  const scope = page.getByRole('region', { name: 'Invalid form focus' });
  const title = scope.getByRole('textbox', { name: 'Native required title', exact: true });
  await scope.getByRole('button', { name: 'Require focus title' }).click();
  await scope.getByRole('button', { name: 'Validate custom fields' }).click();
  await expect(title).toBeFocused();
  expect(await title.evaluate((node: HTMLInputElement) => node.validity.valueMissing)).toBe(true);
  await expect(scope.getByTestId('invalid-focus-submits')).toHaveText('0');
});

test('native cross-tab storage events preserve a newer draft through an older acknowledgement', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  try {
    await other.goto('/');
    const first = page.getByRole('textbox', { name: 'Form message', exact: true });
    const second = other.getByRole('textbox', { name: 'Form message', exact: true });
    await expect(first).toBeEnabled();
    await expect(second).toBeEnabled();
    await first.fill('submitted in first tab');
    await expect(second).toHaveValue('submitted in first tab');
    await first.press('Enter');
    await expect(page.getByTestId('form-calls')).toHaveText('1');
    await second.fill('later revision in another tab');
    await expect(first).toHaveValue('later revision in another tab');
    await second.fill('submitted in first tab');
    await expect(first).toHaveValue('submitted in first tab');
    await page.getByRole('button', { name: 'Confirm message' }).click();
    await expect(first).toHaveValue('submitted in first tab');
    await expect(second).toHaveValue('submitted in first tab');
    await expect(page.getByTestId('form-persisted')).toHaveText('true');
  } finally {
    await other.close();
  }
});

test('real localStorage quota failure retains unsaved text through submit and rejection', async ({ page }) => {
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Form message', exact: true });
  await expect(text).toBeEnabled();
  await text.fill('last persisted version');
  await expect(page.getByTestId('form-persisted')).toHaveText('true');
  const quota = await page.evaluate(() => {
    let index = 0;
    let failure = '';
    for (const size of [256 * 1024, 1024]) {
      try {
        for (;;) localStorage.setItem(`quota-fixture-${index++}`, 'q'.repeat(size));
      } catch (error) {
        failure = error instanceof DOMException ? error.name : String(error);
      }
    }
    return failure;
  });
  expect(quota).toBe('QuotaExceededError');
  const unsaved = 'local'.repeat(500);
  await text.fill(unsaved);
  await expect(page.getByTestId('form-persisted')).toHaveText('false');
  await expect(page.getByTestId('form-unsaved')).toHaveText('true');
  await page.getByRole('button', { name: 'Submit message' }).click();
  await expect(text).toHaveValue(unsaved);
  await expect(page.getByTestId('form-calls')).toHaveText('1');
  await page.getByRole('button', { name: 'Reject message' }).click();
  await expect(text).toHaveValue(unsaved);
  await expect(page.getByTestId('form-error')).toHaveText('Send rejected');
});

test('corrupt persisted JSON does not prevent editing and the next successful write repairs it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const text = page.getByRole('textbox', { name: 'Form message', exact: true });
  await expect(text).toBeEnabled();
  await text.fill('persist before corruption');
  const key = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.includes('owner-a') && key.includes('form-browser:room-a'));
    if (!key) throw new Error('The public form did not persist its draft');
    localStorage.setItem(key, '{broken');
    return key;
  });
  await page.reload();
  await expect(text).toBeEnabled();
  await expect(text).toHaveValue('');
  await expect(page.getByTestId('form-persisted')).toHaveText('false');
  await text.fill('repaired draft');
  await expect(page.getByTestId('form-persisted')).toHaveText('true');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).text, key)).toBe('repaired draft');
  expect(errors).toEqual([]);
});
