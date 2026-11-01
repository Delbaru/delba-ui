# PhoneField

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Телефон с выбором страны, форматированием и международной моделью номера.
Проектный D*-компонент задаёт внешний вид и разрешённый список стран.
Для фиксированного российского формата существует также Input type='tel'.

## Основной API

- Обязательные `country={ countries: 'all' | CountryCode[], default: CountryCode }`
  и строковый `value`: компонент controlled.
- `onValueChange(value, details)` возвращает E.164 или полезное частичное
  международное значение во время ввода. Details содержит данные номера,
  `reason` и `event`; `onChange(event)` сохраняет настоящее событие input.
- `locale='ru'` задаёт названия стран и сообщения проверки.
- Наследует Input: `label`, `error`, `comment`, `disabled`, `readOnly`, `loading`,
  варианты/размеры и collapse. `slots.end` доступен; start занят выбором страны.
- `type`, `phone`, `defaultValue` не принадлежат этому API; ref — HTMLInputElement.

## Пример

Клиентский компонент; список стран и default согласованы:

```tsx
'use client';
import { useState } from 'react';
import { PhoneField } from '@delba/ui';

export function ContactPhone() {
  const [phone, setPhone] = useState('');
  return <PhoneField label="Телефон" country={{ countries: ['RU', 'KZ'], default: 'RU' }}
    value={phone} onValueChange={(value) => setPhone(value)} locale="ru" />;
}
```

## Состояния и ограничения

Пустой каталог или default вне countries вызывает RangeError.
Частичный номер ещё не подтверждает валидность; проверка принадлежит общей
механике номера и приложению перед отправкой. Выбор страны даёт `reason='country'`
и `event=null`. Disabled/readOnly блокируют country picker.
Подключён также отдельный публичный вход `@delba/ui/phone-field` для загрузки по необходимости.

## Приёмка изменения

- Ввод, вставка международного номера и смена страны сохраняют модель и курсор.
- Поиск страны, клавиатура, общий телефонный код и readOnly проверены.
- SSR/клиент используют одну locale; ошибка не подменяет partial value валидным номером.

[API](../../../../src/components/PhoneField/PhoneField.tsx) · [Страны](../../../../src/components/PhoneField/countries.ts) ·
[Input](Input.md) · [Приёмка](../../verification/acceptance.md)
