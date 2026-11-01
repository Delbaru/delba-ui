# Select

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Выбор одного или нескольких значений из списка, включая группы вариантов.
Проектный DSelect закрепляет оформление; позиционирование, клавиатура и состояние
списка остаются у кита. Для короткого видимого выбора см. ChoiceButtons.

## Основной API

- `options`: `{ value, label, children?, selectedChildren? }` или группы `{ label, options }`.
- Одиночный режим: `value: T | null`, `onChange(value: T | null)`.
- `multiple=true`: `value: T[]`, `onChange(value: T[])`; `defaultValue` — неуправляемый режим.
- `closeOnSelect=false` влияет на multiple; одиночный выбор закрывает список.
  `showSelected=true`, `visibleOptions=4`, `loading=false`.
- `variant`: `primary`/`primaryFill`/`secondary`; `size`: `default`/`fullWidth`.
  Resolver задаёт `primary` и `default` без явной геометрии.
- `label`, `placeholder='Выберите значение'`, `error`, `required`, `validate`;
  `name` и `form` подключают значение к FormData.
- `panel` оформляет список, `collapse` сворачивает всё поле; ref — корень div.

## Пример

Клиентский компонент; callback принимает значение, не событие:

```tsx
'use client';
import { useState } from 'react';
import { Select } from '@delba/ui';

export function FormatField() {
  const [format, setFormat] = useState<string | null>(null);
  return <Select label="Формат" name="format" value={format} onChange={setFormat}
    options={[{ value: 'stl', label: 'STL' }, { value: 'obj', label: 'OBJ' }]} />;
}
```

## Состояния и ограничения

Loading сохраняет шеврон и блокирует раскрытие; disabled запрещает выбор.
Multiple отправляет несколько записей одного `name`. У каждого пункта нужен текстовый
`label`, даже при кастомной разметке. Управление open списка принадлежит Select.

## Приёмка изменения

- Стрелки/Enter/Escape, фокус и выбор работают в обеих ветках multiple.
- Loading/disabled не раскрывают список; FormData соответствует модели.
- Панель помещается во viewport, root collapse закрывает открытый список.

[API](../../../../src/components/Select/Select.tsx) · [Опции](../../../../src/components/Select/options.ts) ·
[ChoiceButtons](ChoiceButtons.md) · [Приёмка](../../verification/acceptance.md)
