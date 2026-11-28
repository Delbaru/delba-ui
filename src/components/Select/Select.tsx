'use client';

import type { WithRef } from '#core';
import { Dropdown } from '../Dropdown';
import { FieldFrame } from '../Field';
import { Skeleton } from '../Skeleton';
import { useSelectField } from './Select.model';
import type { SelectProps } from './Select.types';
import { SelectOptions } from './SelectOptions/SelectOptions';
import { SelectTrigger } from './SelectTrigger/SelectTrigger';

export type { SelectProps, SelectBaseProps, SelectValueProps, SelectSearchProps } from './Select.types';

export function Select<T extends string = string>(props: WithRef<SelectProps<T>, HTMLDivElement>) {
  const field = useSelectField(props);

  return (
    <FieldFrame {...field.frame}>
      <Dropdown {...field.dropdown} trigger={<SelectTrigger {...field.trigger} />}>
        {field.search && field.loading && <Skeleton h={[16, 16, 16]} />}
        <SelectOptions select={field.select} multiple={field.multiple} />
      </Dropdown>
      {field.form.values.map((value, index) => (
        <input key={`${value}-${index}`} type="hidden" name={field.form.name} form={field.form.id} value={value} />
      ))}
    </FieldFrame>
  );
}
