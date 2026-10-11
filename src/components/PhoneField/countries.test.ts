import assert from 'node:assert/strict';
import test from 'node:test';

import {
    filterPhoneCountries,
    getPhoneCountries,
    groupPhoneCountries,
    isAllowedPhoneCountry,
    type PhoneCountryConfig,
} from './countries';

const config: PhoneCountryConfig = { countries: ['US', 'CA', 'GB'], default: 'US' };
const countries = getPhoneCountries(config, 'en');

test('country catalogue validates the default against the allow-list', () => {
    assert.throws(
        () => getPhoneCountries({ countries: ['GB'], default: 'US' }),
        /must be included/,
    );
    assert.throws(() => getPhoneCountries({ countries: [], default: 'US' }), /at least one/);
});

test('country names use the requested locale deterministically', () => {
    assert.equal(getPhoneCountries(config, 'ru').find(({ code }) => code === 'GB')?.name, 'Великобритания');
    assert.equal(getPhoneCountries(config, 'en').find(({ code }) => code === 'GB')?.name, 'United Kingdom');
});

test('search matches country names, ISO codes and calling codes', () => {
    assert.deepEqual(
        filterPhoneCountries(countries, 'united states').map(({ code }) => code),
        ['US'],
    );
    assert.deepEqual(
        filterPhoneCountries(countries, 'ca').map(({ code }) => code),
        ['CA'],
    );
    assert.deepEqual(
        filterPhoneCountries(countries, '+1').map(({ code }) => code),
        ['CA', 'US'],
    );
});

test('countries sharing a calling code are grouped; auto-detection obeys the allow-list', () => {
    const groups = groupPhoneCountries(countries);
    assert.deepEqual(
        groups.find(({ callingCode }) => callingCode === '1')?.countries.map(({ code }) => code),
        ['CA', 'US'],
    );
    assert.equal(isAllowedPhoneCountry('CA', countries), true);
    assert.equal(isAllowedPhoneCountry('FR', countries), false);
    assert.equal(isAllowedPhoneCountry(undefined, countries), false);
});
