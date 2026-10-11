'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
import { type CountryCode } from 'libphonenumber-js/min';

import { Input, type InputProps } from '../Input';
import { CountryPicker } from './CountryPicker';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import { useMergedRefs, type FieldValueChangeDetails, type WithRef } from '../../core';
import {
    getPhoneCountries,
    isAllowedPhoneCountry,
    type PhoneCountryConfig,
} from './countries';
import { changePhoneCountry, resolvePhoneNumber, validatePhoneValue, type PhoneNumberDetails } from './phone-number';

export interface PhoneFieldProps
    extends Omit<
        InputProps,
        'type' | 'phone' | 'collapse' | 'value' | 'defaultValue' | 'onValueChange' | 'onChange' | 'slots'
    > {
    /** Country catalogue and initial country. `default` must be included in `countries`. */
    country: PhoneCountryConfig;
    /** Controlled E.164 number; incomplete input is emitted as a partial international value. */
    value: string;
    /** Receives the actual native input change event unchanged. */
    onChange?: ChangeEventHandler<HTMLInputElement>;
    /** Receives the E.164 model value, including useful partial values while editing. */
    onValueChange?: (value: string, details: PhoneFieldChangeDetails) => void;
    /** Collapse the whole field, including country picker, label and helper text. */
    collapse?: CollapseOptions;
    /** Locale used for country names, kept explicit for consistent server/client rendering. */
    locale?: string;
    /** Дополнительная часть справа; левую часть занимает выбор страны. */
    slots?: Pick<NonNullable<InputProps['slots']>, 'end'>;
}

export type PhoneFieldChangeDetails = PhoneNumberDetails & FieldValueChangeDetails<HTMLInputElement>;

export type PhoneCountryCode = CountryCode;

export function PhoneField({
    country,
    value,
    onChange,
    onValueChange,
    collapse,
    locale = 'ru',
    validate,
    disabled,
    readOnly,
    ref,
    ...inputProps
}: WithRef<PhoneFieldProps, HTMLInputElement>) {
    const countries = useMemo(
        () => getPhoneCountries(country, locale),
        [country.countries, country.default, locale],
    );
    const [selection, setSelection] = useState<{ country: CountryCode; value?: string }>({ country: country.default });
    const detectedValueCountry = resolvePhoneNumber(value, country.default).details.detectedCountry;
    const valueIsInternational = value.trimStart().startsWith('+');
    // Countries can share a calling code: a picker choice must survive an unchanged number.
    const hasExplicitSelection = selection.value === value && isAllowedPhoneCountry(selection.country, countries);
    const allowedDetectedCountry = valueIsInternational && isAllowedPhoneCountry(detectedValueCountry, countries)
        ? detectedValueCountry
        : undefined;
    const fallbackCountry = isAllowedPhoneCountry(selection.country, countries) ? selection.country : country.default;
    const currentCountry =
        hasExplicitSelection ? selection.country : allowedDetectedCountry ?? fallbackCountry;
    const triggerCountry = !hasExplicitSelection && valueIsInternational && detectedValueCountry ? detectedValueCountry : currentCountry;
    const number = resolvePhoneNumber(value, currentCountry);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const caretFrame = useRef<number | null>(null);
    const mergedInputRef = useMergedRefs(ref, inputRef);

    useEffect(() => () => {
        if (caretFrame.current !== null) cancelAnimationFrame(caretFrame.current);
    }, []);

    const handleInputValueChange = (rawValue: string, inputDetails: FieldValueChangeDetails<HTMLInputElement>) => {
        const next = resolvePhoneNumber(rawValue, currentCountry);
        const nextCountry = isAllowedPhoneCountry(next.details.detectedCountry, countries)
            ? next.details.detectedCountry
            : currentCountry;
        if (nextCountry !== currentCountry || selection.value !== undefined) setSelection({ country: nextCountry });
        onValueChange?.(next.value, { ...next.details, country: nextCountry, ...inputDetails });

        const input = inputDetails.event?.target;
        if (input && input.selectionStart !== null && input.selectionEnd !== null) {
            const startDigits = rawValue.slice(0, input.selectionStart).replace(/\D/g, '').length;
            const endDigits = rawValue.slice(0, input.selectionEnd).replace(/\D/g, '').length;
            const caretAtEnd = input.selectionStart === rawValue.length && input.selectionEnd === rawValue.length;
            const positionAfterDigits = (text: string, count: number) => {
                if (count === 0) return text.startsWith('+') ? 1 : 0;
                let seen = 0;
                for (let index = 0; index < text.length; index += 1) {
                    if (/\d/.test(text.charAt(index)) && ++seen === count) return index + 1;
                }
                return text.length;
            };
            const selectionStart = caretAtEnd ? next.formatted.length : positionAfterDigits(next.formatted, startDigits);
            const selectionEnd = caretAtEnd ? selectionStart : positionAfterDigits(next.formatted, endDigits);
            if (caretFrame.current !== null) cancelAnimationFrame(caretFrame.current);
            caretFrame.current = requestAnimationFrame(() => {
                caretFrame.current = null;
                const currentInput = inputRef.current;
                if (currentInput === input && currentInput.value === next.formatted)
                    currentInput.setSelectionRange(selectionStart, selectionEnd);
            });
        }
    };

    const selectionRef = useRef({ number, currentCountry, onValueChange });
    useLayoutEffect(() => {
        selectionRef.current = { number, currentCountry, onValueChange };
    });

    const handleCountryChange = useCallback((nextCountry: CountryCode) => {
        const current = selectionRef.current;
        const next = changePhoneCountry(current.number.formatted, current.currentCountry, nextCountry);
        setSelection({ country: nextCountry, value: next.value });
        current.onValueChange?.(next.value, { ...next.details, reason: 'country', event: null });
    }, []);

    const countryPicker = (
        <CountryPicker
            countries={countries}
            country={triggerCountry}
            disabled={disabled || readOnly}
            locale={locale}
            onSelect={handleCountryChange}
        />
    );

    return (
        <Input
            {...inputProps}
            ref={mergedInputRef}
            collapse={collapse}
            slots={{ ...inputProps.slots, start: countryPicker }}
            type="text"
            inputMode="tel"
            value={number.formatted}
            disabled={disabled}
            readOnly={readOnly}
            validate={(inputValue) =>
                validatePhoneValue(
                    inputValue,
                    currentCountry,
                    countries.map(({ code }) => code),
                    locale,
                ) ?? validate?.(inputValue)
            }
            onChange={onChange}
            onValueChange={handleInputValueChange}
        />
    );
}
