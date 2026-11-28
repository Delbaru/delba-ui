'use client';

import { cx, type WithRef } from '#core';
import { Input } from '../Input';
import { CountryPicker } from './CountryPicker/CountryPicker';
import { usePhoneField } from './PhoneField.model';
import type { PhoneFieldProps } from './PhoneField.types';
import styles from './PhoneField.module.scss';

export type { PhoneCountryCode, PhoneFieldChangeDetails, PhoneFieldProps } from './PhoneField.types';

export function PhoneField(props: WithRef<PhoneFieldProps, HTMLInputElement>) {
  const phone = usePhoneField(props);

  return (
    <Input
      {...phone.input}
      className={cx(styles.PhoneField, props.className)}
      slots={{
        ...props.slots,
        start: <CountryPicker {...phone.country} />,
      }}
    />
  );
}
