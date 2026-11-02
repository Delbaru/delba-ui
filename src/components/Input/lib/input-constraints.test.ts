import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeTimeValue, validateDateBounds, validateTimeBounds } from './input-constraints';

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

test('time normalization maps both ends of a selection across the inserted colon', () => {
  assert.deepEqual(normalizeTimeValue('1234', 3, 4), {
    normalizedValue: '12:34',
    selectionStart: 4,
    selectionEnd: 5,
  });
  assert.deepEqual(normalizeTimeValue('12:34', null, null), {
    normalizedValue: '12:34',
    selectionStart: null,
    selectionEnd: null,
  });
});
