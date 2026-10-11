import { AsYouType, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min';

export interface PhoneNumberDetails {
    /** The country currently selected in the country picker. */
    country: CountryCode;
    /** Country recognized from an international number, when metadata identifies one. */
    detectedCountry?: CountryCode;
    /** True only when libphonenumber-js recognizes a valid complete number. */
    isValid: boolean;
    /** True when the number has a possible length for its country. */
    isPossible: boolean;
}

export interface PhoneNumberState {
    /** Formatted international value shown in the native input. */
    formatted: string;
    /** E.164 model value; incomplete numbers remain useful while the user is editing. */
    value: string;
    details: PhoneNumberDetails;
    nationalDigits: string;
}

function digitsOf(value: string): string {
    return value.replace(/\D/g, '');
}

export function resolvePhoneNumber(rawValue: string, country: CountryCode): PhoneNumberState {
    const isInternational = rawValue.trimStart().startsWith('+');
    const formatter = new AsYouType(isInternational ? undefined : country);
    formatter.input(rawValue);
    const phoneNumber = formatter.getNumber();
    const detectedCountry = phoneNumber?.country ?? formatter.getCountry() ?? undefined;
    const digits = digitsOf(rawValue);
    const callingCode = getCountryCallingCode(country);
    const parsedDigits = phoneNumber?.number.replace(/\D/g, '');
    const preserveInternationalInput = isInternational && parsedDigits !== digits;
    const value = preserveInternationalInput
        ? `+${digits}`
        : (phoneNumber?.number ??
          (isInternational ? `+${digits}` : digits.length > 0 ? `+${callingCode}${digits}` : ''));
    const formatted = preserveInternationalInput
        ? rawValue
        : value
          ? new AsYouType().input(value)
          : '';

    return {
        formatted,
        value,
        details: {
            country,
            ...(detectedCountry ? { detectedCountry } : {}),
            isValid: phoneNumber?.isValid() ?? false,
            isPossible: phoneNumber?.isPossible() ?? false,
        },
        nationalDigits: isInternational
            ? fallbackNationalDigits(rawValue, formatter.getCallingCode() ?? callingCode, true)
            : (phoneNumber?.nationalNumber ?? digits),
    };
}

function fallbackNationalDigits(
    rawValue: string,
    callingCode: string,
    isInternational: boolean,
): string {
    const digits = digitsOf(rawValue);
    if (!isInternational) return digits;

    return digits.startsWith(callingCode) ? digits.slice(callingCode.length) : digits;
}

export function changePhoneCountry(
    rawValue: string,
    currentCountry: CountryCode,
    nextCountry: CountryCode,
): PhoneNumberState {
    const current = resolvePhoneNumber(rawValue, currentCountry);
    if (!current.nationalDigits) return resolvePhoneNumber('', nextCountry);

    const nextCallingCode = getCountryCallingCode(nextCountry);
    return resolvePhoneNumber(`+${nextCallingCode}${current.nationalDigits}`, nextCountry);
}

/** Advisory client validation; server validation remains authoritative. */
export function validatePhoneValue(
    value: string,
    country: CountryCode,
    allowedCountries: readonly CountryCode[],
    locale = 'ru',
): string | undefined {
    if (!value.trim()) return undefined;

    const russian = locale.toLowerCase().startsWith('ru');
    const invalidLength = russian
        ? 'Проверьте длину номера телефона.'
        : 'Check the phone number length.';
    const unavailableCountry = russian
        ? 'Номер относится к стране, недоступной для выбора.'
        : 'This phone number belongs to a country that is not available.';

    if (value.trimStart().startsWith('+')) {
        const international = new AsYouType();
        international.input(value);
        const detectedCountry = international.getCountry();
        if (detectedCountry && !allowedCountries.includes(detectedCountry)) return unavailableCountry;

        const callingCode = international.getCallingCode();
        if (
            callingCode &&
            !allowedCountries.some((allowedCountry) => getCountryCallingCode(allowedCountry) === callingCode)
        ) {
            return unavailableCountry;
        }
    }

    const number = resolvePhoneNumber(value, country);
    return number.details.isPossible ? undefined : invalidLength;
}
