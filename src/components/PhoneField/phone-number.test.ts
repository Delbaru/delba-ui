import assert from 'node:assert/strict';
import test from 'node:test';

import { changePhoneCountry, resolvePhoneNumber, validatePhoneValue } from './phone-number';

test('AsYouType formats a full international value and reports its metadata validity', () => {
    const number = resolvePhoneNumber('+1 213 373 4253', 'US');
    assert.equal(number.value, '+12133734253');
    assert.equal(number.formatted, '+1 213 373 4253');
    assert.equal(number.details.isValid, true);
    assert.equal(number.details.detectedCountry, 'US');
});

test('partial numbers remain an E.164 prefix while editing', () => {
    const number = resolvePhoneNumber('213', 'US');
    assert.equal(number.value, '+1213');
    assert.equal(number.formatted, '+1 213');
    assert.equal(number.details.isValid, false);
});

test('changing country keeps national significant digits and replaces the calling code', () => {
    const number = changePhoneCountry('+1 213 373 4253', 'US', 'GB');
    assert.equal(number.value, '+442133734253');
    assert.equal(number.nationalDigits, '2133734253');
});

test('changing country does not silently truncate an overlong edit', () => {
    const number = changePhoneCountry('+1 12345678901234567890', 'US', 'GB');
    assert.equal(number.nationalDigits, '12345678901234567890');
    assert.equal(number.value, '+4412345678901234567890');
});

test('advisory validation checks possibility and rejects international countries outside the allow-list', () => {
    assert.equal(validatePhoneValue('+1 213 373 4253', 'US', ['US'], 'en'), undefined);
    assert.match(
        validatePhoneValue('+44 20 7031 3000', 'US', ['US'], 'en') ?? '',
        /not available/,
    );
    assert.match(validatePhoneValue('+1 213', 'US', ['US'], 'en') ?? '', /length/);
    assert.equal(validatePhoneValue('+44 20 7031 3000', 'GB', ['GB'], 'en'), undefined);
});
