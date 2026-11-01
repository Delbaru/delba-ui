# Input

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Однострочное поле с общей моделью ввода, форматированием и обратной связью.
Готовые DInput/DField потребителя задают оформление и пресеты экрана;
не копируй в них маску, шаг числа, календарь или механику ошибки.

## Основной API

- `type='text'`; поддерживаются специальные режимы телефона, числа, даты и времени.
- `value` + `onValueChange(value, details)` — модель после форматирования;
  `defaultValue` — начальное значение неуправляемого поля.
- `onChange(event)` — настоящее событие до форматирования; это другой контракт.
- `variant`: `primary`/`secondary`; `size`: `default`/`fullWidth`.
  Общий resolver задаёт `primary` и `default`, если нет явной геометрии.
- `label`, `comment`, `error`, `required`, `validate(value)`, `length`, `seed`.
- `loading=false`, `revealable=false`, `showNumberControls=true`;
  `errorPlacement='inside'`, `nativeValidation=false`.
- `slots.start/end`, `field`, `rowClassName`; DOM ref указывает на input.

## Пример

Клиентский компонент; callback получает строку модели, не DOM-событие:

```tsx
'use client';
import { useState } from 'react';
import { Input } from '@delba/ui';

export function NameField() {
  const [name, setName] = useState('');
  return <Input label="Имя" value={name} onValueChange={setName} />;
}
```

## Состояния и ограничения

У ошибки приоритет над комментарием. `inside` освобождает значение при фокусе;
у телефонного режима ошибка всегда ниже поля. `seed` — значение-подсказка
с отдельными изменениями модели на focus/blur; `details.event` бывает `null`.
Формат `type='tel'` по умолчанию российский; международный выбор — PhoneField.

## Приёмка изменения

- Ввод и форматирование возвращают ожидаемую модель без потери курсора и DOM ref.
- Ошибка, loading, подпись и клавиатура проверены в используемом типе поля.
- Программный шаг/выбор не подменяет настоящий `onChange` синтетическим событием.

[Типы](../../../../src/components/Input/types.ts) · [Реализация](../../../../src/components/Input/Input.tsx) ·
[PhoneField](PhoneField.md) · [Приёмка](../../verification/acceptance.md)
