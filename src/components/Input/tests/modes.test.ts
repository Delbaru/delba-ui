import assert from 'node:assert/strict';
import test from 'node:test';

import { inputModes } from '../Input.modes';
import { DEFAULT_PHONE_FORMAT, maxLengthOf, type PhoneFormat } from '../../../core/fields/phone';

const resolve = (
  type: React.HTMLInputTypeAttribute,
  min?: string,
  max?: string,
  phoneFormat = DEFAULT_PHONE_FORMAT,
) => inputModes.resolve({ type, min, max, phoneFormat });

test('one registry resolves native aliases, native types, and autofill policy', () => {
  const email = resolve('email');
  assert.deepEqual([email.kind, email.domInputType, email.locksAutofill], ['email', 'text', true]);
  assert.equal(email.nativeAttributes('', false, {}).inputMode, 'email');
  assert.equal(email.nativeAttributes('', false, { inputMode: 'text' }).inputMode, 'email');
  assert.equal(typeof email.nativeAttributes('', false, {}).pattern, 'string');

  const phone = resolve('tel');
  assert.deepEqual([phone.kind, phone.domInputType, phone.locksAutofill], ['phone', 'text', true]);
  assert.equal(phone.policy.value.draftKey, 'phone');
  assert.equal(phone.policy.value.binding, 'model');
  assert.equal(phone.policy.value.supportsSeed, false);
  assert.equal(phone.policy.value.edit('2', 1, 1)?.writeDisplay, undefined);

  const time = resolve('time');
  assert.deepEqual([time.kind, time.domInputType, time.locksAutofill], ['time', 'text', false]);
  assert.equal(time.nativeAttributes('', false, {}).inputMode, 'numeric');
  assert.equal(time.nativeAttributes('', false, { inputMode: 'text' }).inputMode, 'numeric');
  assert.equal(resolve('data').kind, 'date');
  assert.equal(resolve('search').domInputType, 'search');

  for (const type of ['phone', 'constructor', 'toString'] as const) {
    const unknown = resolve(type);
    assert.deepEqual([unknown.kind, unknown.inputType, unknown.domInputType], ['text', type, type]);
    assert.equal(unknown.locksAutofill, false);
  }
});

test('mode policy owns normalization, display, edits, and key rules', () => {
  const phoneFormat: PhoneFormat = {
    dial: '+375',
    digits: 9,
    groups: [2, 3, 2, 2],
    sample: '291234567',
  };
  const phone = resolve('tel', undefined, undefined, phoneFormat);
  assert.equal(phone.policy.value.normalize('291234567'), '+375 (29) 123 - 45 - 67');
  assert.equal(phone.policy.value.display('+375 (29) 123 - 45 - 67'), '(29) 123 - 45 - 67');
  assert.deepEqual(phone.policy.value.edit('(29) 12', 6, 7), {
    value: '+375 (29) 12',
    displayValue: '(29) 12',
    selectionStart: 6,
    selectionEnd: 7,
  });
  assert.equal(phone.nativeAttributes('', false, {}).maxLength, maxLengthOf(phoneFormat));
  assert.equal(phone.decoration('+375 ', false).empty, true);

  const time = resolve('time');
  assert.equal(time.policy.value.normalize('1234'), '12:34');
  assert.equal(time.policy.value.supportsSeed, false);
  assert.deepEqual(time.policy.value.edit('1234', 3, 4), {
    value: '12:34',
    displayValue: '12:34',
    selectionStart: 4,
    selectionEnd: 5,
    validation: 'commit',
    writeDisplay: false,
  });
  assert.equal(time.nativeAttributes('12:34', true, {}).placeholder, '');
  assert.equal(time.decoration('12', true).time?.suffix, ':__');

  const date = resolve('date');
  assert.equal(date.policy.value.normalize('2025-01-14'), '14.01.2025');
  assert.equal(date.policy.value.supportsSeed, false);
  assert.equal(date.policy.blur, 'scope');
  assert.equal(date.calendar, true);
  assert.equal(date.policy.value.edit('14.01.2025', 2, 2), null);
  assert.equal(date.nativeAttributes('', false, { length: { max: 20 } }).readOnly, true);
  assert.equal(date.nativeAttributes('', false, { length: { max: 20 } }).maxLength, 10);
  assert.equal(resolve('data').nativeAttributes('', false, {}).readOnly, true);

  const text = resolve('text');
  assert.deepEqual(text.policy.value.edit('hello', 5, 5), { value: 'hello' });
  assert.equal(
    text.nativeAttributes('', false, { placeholder: 'seed value' }).placeholder,
    undefined,
  );

  const nonnegativeNumber = resolve('number', '0');
  assert.deepEqual(resolve('number').policy.value.edit('12', 2, 2), { value: '12' });
  assert.deepEqual(nonnegativeNumber.policy.value.edit('-12', 1, 2), {
    value: '12',
    displayValue: '12',
    validation: 'commit',
    writeDisplay: true,
  });
  assert.equal(resolve('number').policy.keyboard?.allowsKey('-'), true);
  assert.equal(nonnegativeNumber.policy.keyboard?.allowsKey('-'), false);
  assert.equal(resolve('number').policy.validation.whileEditing, true);
});

test('mode validation retains bounds and phone custom-validator behavior', () => {
  assert.equal(
    resolve('date', undefined, '2025-01-13').policy.validation.check('14.01.2025'),
    'Дата не может быть позже 13.01.2025',
  );
  assert.equal(
    resolve('time', '09:00').policy.validation.check('08:30'),
    'Время не может быть раньше 09:00',
  );
  assert.equal(resolve('email').policy.validation.check('wrong'), 'Неверный формат email');

  const belarus: PhoneFormat = {
    dial: '+375',
    digits: 9,
    groups: [2, 3, 2, 2],
    sample: '291234567',
  };
  let customValidatorCalled = false;
  const customValidator = () => {
    customValidatorCalled = true;
    return 'custom';
  };
  const phonePolicy = resolve('tel', undefined, undefined, belarus).policy;
  assert.equal(
    phonePolicy.validation.check('+375 (29) 123', customValidator),
    'Введите 12 цифр номера',
  );
  assert.equal(customValidatorCalled, false);
  assert.equal(phonePolicy.validation.check('+375 (29) 123 - 45 - 67', customValidator), undefined);
  assert.equal(customValidatorCalled, false);
  phonePolicy.validation.check('', customValidator);
  assert.equal(customValidatorCalled, true);
});
