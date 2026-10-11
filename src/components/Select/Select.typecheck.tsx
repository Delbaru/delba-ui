import type { Dispatch, SetStateAction } from 'react';

import { Select } from './Select';

const options = [
  { value: 'ru', label: 'Россия' },
  { value: 'kz', label: 'Казахстан' },
] as const;
type Country = (typeof options)[number]['value'];

// Проверяется компилятором в ui:test; в приложение этот файл не импортируется.
export function selectTypeChecks(
  country: Country | null,
  countries: Country[],
  setCountry: Dispatch<SetStateAction<Country | null>>,
  setCountries: Dispatch<SetStateAction<Country[]>>,
) {
  const single = <Select options={options} value={country} onChange={setCountry} />;
  const multiple = <Select options={options} multiple value={countries} onChange={setCountries} />;
  const defaults = <Select options={options} multiple defaultValue={['ru']} />;

  // @ts-expect-error Одиночный выбор не принимает массив.
  const invalidSingle = <Select options={options} value={countries} />;
  // @ts-expect-error Множественный выбор не принимает скаляр.
  const invalidMultiple = <Select options={options} multiple value="ru" />;
  // @ts-expect-error Обработчик одиночного выбора не получает массив.
  const invalidChange = <Select options={options} onChange={setCountries} />;
  // @ts-expect-error Начальный вариант должен присутствовать в типе опций.
  const invalidDefault = <Select options={options} defaultValue="us" />;
  // @ts-expect-error Select поддерживает только строковые значения.
  const invalidNumber = <Select options={[{ value: 1, label: 'Один' }]} />;

  return [single, multiple, defaults, invalidSingle, invalidMultiple, invalidChange, invalidDefault, invalidNumber];
}
