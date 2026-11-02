import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeConstraintValue,
  validateDateBounds,
  validateTimeBounds,
} from '../formats/constraints';
import { normalizeEdit } from '../formats/time';

test('date and time bounds format the same errors used by Input validation', () => {
  assert.equal(
    validateDateBounds('2025-01-14', '2025-01-15'),
    'Дата не может быть раньше 15.01.2025',
  );
  assert.equal(
    validateDateBounds('15.01.2025', undefined, '2025-01-14'),
    'Дата не может быть позже 14.01.2025',
  );
  assert.equal(validateTimeBounds('08:30', '09:00'), 'Время не может быть раньше 09:00');
  assert.equal(validateTimeBounds('18:30', undefined, '18:00'), 'Время не может быть позже 18:00');
});

test('constraints apply inclusive bounds and ignore values that are not valid for their mode', () => {
  assert.equal(validateDateBounds('15.01.2025', '15.01.2025', '15.01.2025'), undefined);
  assert.equal(validateDateBounds('not a date', '01.01.2025'), undefined);
  assert.equal(validateTimeBounds('09:00', '09:00', '09:00'), undefined);
  assert.equal(validateTimeBounds('incomplete', '09:00'), undefined);
  assert.equal(normalizeConstraintValue(10), undefined);
  assert.equal(normalizeConstraintValue('10'), '10');
});

test('time edit maps both selection edges across the inserted colon', () => {
  assert.deepEqual(normalizeEdit('1234', 3, 4), {
    value: '12:34',
    selectionStart: 4,
    selectionEnd: 5,
  });
});
