'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js/min';
import { useMergedRefs, type FieldValueChangeDetails, type WithRef } from '../../core';
import { scheduleCaretRestore } from '../../core/base/restore-caret';
import { getPhoneCountries, isAllowedPhoneCountry } from './countries';
import { phoneNumbers } from './phone-number';
import type { PhoneFieldProps } from './PhoneField';

/** Country selection and international formatting share one controlled model value. */
export function usePhoneField(props: WithRef<PhoneFieldProps, HTMLInputElement>) {
  const {
    country,
    value,
    locale = 'ru',
    onChange,
    onValueChange,
    validate,
    disabled,
    readOnly,
    ref,
    ...inputProps
  } = props;
  const countries = useMemo(
    () => getPhoneCountries(country, locale),
    [country.countries, country.default, locale],
  );
  const [selection, setSelection] = useState<{ country: CountryCode; value?: string }>({
    country: country.default,
  });
  const detected = phoneNumbers.read(value, country.default).details.detectedCountry;
  const international = value.trimStart().startsWith('+');
  const explicit = selection.value === value && isAllowedPhoneCountry(selection.country, countries);
  const allowed =
    international && isAllowedPhoneCountry(detected, countries) ? detected : undefined;
  const fallback = isAllowedPhoneCountry(selection.country, countries)
    ? selection.country
    : country.default;
  const currentCountry = explicit ? selection.country : (allowed ?? fallback);
  const triggerCountry = !explicit && international && detected ? detected : currentCountry;
  const number = phoneNumbers.read(value, currentCountry);
  const input = useRef<HTMLInputElement | null>(null);
  const inputRef = useMergedRefs(ref, input);
  const cancelCaret = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelCaret.current?.(), []);

  function changeValue(rawValue: string, details: FieldValueChangeDetails<HTMLInputElement>) {
    const next = phoneNumbers.read(rawValue, currentCountry);
    const nextCountry = isAllowedPhoneCountry(next.details.detectedCountry, countries)
      ? next.details.detectedCountry
      : currentCountry;
    const target = details.event?.currentTarget;
    const caret = target ? phoneNumbers.selection.map(rawValue, next.formatted, target) : null;

    if (nextCountry !== currentCountry || selection.value !== undefined)
      setSelection({ country: nextCountry });
    onValueChange?.(next.value, { ...next.details, country: nextCountry, ...details });

    if (!target || !caret) return;
    cancelCaret.current?.();
    cancelCaret.current = scheduleCaretRestore(
      {
        input: target,
        displayValue: next.formatted,
        selectionStart: caret.start,
        selectionEnd: caret.end,
        direction: caret.direction,
      },
      () => input.current === target,
    );
  }

  // CountryPicker is memoized: its callback reads the latest committed number.
  const latest = useRef({ number, currentCountry, onValueChange });
  useLayoutEffect(() => {
    latest.current = { number, currentCountry, onValueChange };
  });
  const changeCountry = useCallback((nextCountry: CountryCode) => {
    const current = latest.current;
    const next = phoneNumbers.country.change(
      current.number.formatted,
      current.currentCountry,
      nextCountry,
    );
    setSelection({ country: nextCountry, value: next.value });
    current.onValueChange?.(next.value, { ...next.details, reason: 'country', event: null });
  }, []);

  return {
    input: {
      ...inputProps,
      ref: inputRef,
      type: 'text' as const,
      inputMode: 'tel' as const,
      value: number.formatted,
      disabled,
      readOnly,
      onChange,
      onValueChange: changeValue,
      validate: (text: string) =>
        phoneNumbers.validation.check(
          text,
          currentCountry,
          countries.map(({ code }) => code),
          locale,
        ) ?? validate?.(text),
    },
    country: {
      countries,
      country: triggerCountry,
      disabled: disabled || readOnly,
      locale,
      onSelect: changeCountry,
    },
  };
}
