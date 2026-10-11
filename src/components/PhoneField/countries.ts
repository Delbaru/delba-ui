import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min';

export interface PhoneCountryConfig {
    /** Countries that may be selected or auto-detected. `all` uses libphonenumber-js metadata. */
    countries: 'all' | readonly CountryCode[];
    /** Initially selected country; it must belong to `countries`. */
    default: CountryCode;
}

export interface PhoneCountryOption {
    code: CountryCode;
    name: string;
    callingCode: string;
}

export interface PhoneCountryGroup {
    callingCode: string;
    countries: PhoneCountryOption[];
}

export function getPhoneCountries(config: PhoneCountryConfig, locale = 'ru'): PhoneCountryOption[] {
    const codes = config.countries === 'all' ? getCountries() : [...new Set(config.countries)];
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });

    if (codes.length === 0)
        throw new RangeError('PhoneField country.countries must contain at least one country.');
    if (!codes.includes(config.default))
        throw new RangeError('PhoneField country.default must be included in country.countries.');

    return codes
        .map((code) => ({
            code,
            name: displayNames.of(code) ?? code,
            callingCode: getCountryCallingCode(code),
        }))
        .sort((left, right) => left.name.localeCompare(right.name, locale));
}

export function filterPhoneCountries(
    countries: readonly PhoneCountryOption[],
    query: string,
): PhoneCountryOption[] {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [...countries];

    const digits = normalized.replace(/\D/g, '');
    return countries.filter(
        ({ code, name, callingCode }) =>
            name.toLocaleLowerCase().includes(normalized) ||
            code.toLocaleLowerCase().includes(normalized) ||
            (digits.length > 0 && callingCode.includes(digits)) ||
            `+${callingCode}`.includes(normalized),
    );
}

export function groupPhoneCountries(countries: readonly PhoneCountryOption[]): PhoneCountryGroup[] {
    const groups = new Map<string, PhoneCountryOption[]>();

    for (const country of countries) {
        const group = groups.get(country.callingCode) ?? [];
        group.push(country);
        groups.set(country.callingCode, group);
    }

    return [...groups.entries()]
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([callingCode, groupedCountries]) => ({ callingCode, countries: groupedCountries }));
}

export function isAllowedPhoneCountry(
    candidate: CountryCode | undefined,
    countries: readonly PhoneCountryOption[],
): candidate is CountryCode {
    return candidate !== undefined && countries.some((country) => country.code === candidate);
}
