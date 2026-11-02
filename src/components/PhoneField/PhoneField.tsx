'use client';

import type { ChangeEventHandler } from 'react';
import type { CountryCode } from 'libphonenumber-js/min';
import { cx, type FieldValueChangeDetails, type WithRef } from '../../core';
import { Input, type InputProps } from '../Input';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import { CountryPicker } from './CountryPicker/CountryPicker';
import type { PhoneCountryConfig } from './countries';
import type { PhoneNumberDetails } from './phone-number';
import { usePhoneField } from './PhoneField.model';
import styles from './PhoneField.module.scss';

export interface PhoneFieldProps
  extends Omit<
    InputProps,
    | 'type'
    | 'phone'
    | 'collapse'
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
    | 'onChange'
    | 'slots'
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

export type PhoneFieldChangeDetails = PhoneNumberDetails &
  FieldValueChangeDetails<HTMLInputElement>;

export type PhoneCountryCode = CountryCode;

export function PhoneField(props: WithRef<PhoneFieldProps, HTMLInputElement>) {
  const phone = usePhoneField(props);

  return (
    <Input
      {...phone.input}
      className={cx('PhoneField', styles.PhoneField, props.className)}
      slots={{
        ...props.slots,
        start: <CountryPicker {...phone.country} />,
      }}
    />
  );
}
