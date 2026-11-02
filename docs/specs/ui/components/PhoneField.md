# PhoneField

Статус: текущий договор; сверено с реализацией. Проверки — по критериям ниже и общей приёмке библиотеки.

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

## Устройство

PhoneField.tsx — композиция Input с CountryPicker. PhoneField.model владеет
согласованием explicit country и autodetection, форматированием и контрактом
публикации E.164. phoneNumbers объединяет read, country.change, validation.check
и selection.map над существующими чистыми алгоритмами; это не вторая модель Input.

CountryPicker/ содержит собственный компонент и SCSS. Класс PhoneField добавлен
на корень Input, CountryPicker — на корень Dropdown. Свойства ref/collapse/slots.end
передаются прежним публичным способом. Для textarea и Input общая механика Field
используется напрямую; PhoneField пользуется ей через Input, не создавая ещё draft.

Каретка сопоставляется по цифрам до публичного callback. Восстановление поручено
общему scheduleCaretRestore с отменой прежней команды, проверкой текущего DOM-узла
и formatted value, frame своего ownerDocument. Диапазон и направление сохраняются.
Поиск страны также планирует фокус через документ trigger и отменяет frame при unmount.
Локаль остаётся явным публичным контрактом, включая страны с общим calling code.
