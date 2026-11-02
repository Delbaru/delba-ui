import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDurationPickerModel } from '../DurationPicker.model';

test('duration model bounds the final hour and preserves minute precision when committing hours', () => {
  const changes: number[] = [];
  const model = resolveDurationPickerModel({
    value: 90,
    maxMinutes: 90,
    onValueChange: (minutes) => changes.push(minutes),
  });

  assert.equal(model.wheels.hours.value, 1);
  assert.equal(model.wheels.hours.max, 1);
  assert.equal(model.wheels.minutes.max, 30);
  model.wheels.hours.onChange(0);
  model.wheels.minutes.onChange(30);
  assert.deepEqual(changes, [30, 90]);
});

test('duration model normalizes out-of-range values and invalid limits', () => {
  const changes: number[] = [];
  const maximum = resolveDurationPickerModel({
    value: 2000,
    maxMinutes: Number.NaN,
    onValueChange: (minutes) => changes.push(minutes),
  });
  assert.equal(maximum.wheels.hours.value, 24);
  assert.equal(maximum.wheels.hours.max, 24);
  assert.equal(maximum.wheels.minutes.value, 0);
  assert.equal(maximum.wheels.minutes.max, 0);

  const minimum = resolveDurationPickerModel({
    value: -10,
    maxMinutes: -2,
    onValueChange: (minutes) => changes.push(minutes),
  });
  assert.equal(minimum.wheels.hours.value, 0);
  assert.equal(minimum.wheels.hours.max, 0);
  assert.equal(minimum.wheels.minutes.max, 0);
});
