# Calendar

Статус: самостоятельный компонент реализован по согласованию владельца, 2026-11-02.
Публичный вход — `@delba/ui`. Приёмка реализации проверяется отдельно.

## Назначение

Выбор одной календарной даты прямо в странице или внутри поверхности потребителя.
Calendar не требует Input, не открывает портал и не знает о форме ввода.
InputCalendar задаёт открытие, предметную реакцию на закрытие и возврат фокуса.
InputCalendar использует внешний якорь Dropdown; тот владеет позицией, portal host и dismiss.

## Договор

- `value` и `onValueChange(value)` — controlled-дата в формате `YYYY-MM-DD`.
  Второго состояния выбранной даты нет; обновление значения принадлежит потребителю.
- `minValue/maxValue` — включительные границы в том же формате.
- `disabled` запрещает выбор и навигацию.
- Раскладка — общие BoxLayoutProps; `id`, `className`, `style` и DOM ref относятся
  к корню календаря. Подпись доступности задаётся стандартными aria props.
- `dayIdPrefix` задаёт основу идентификаторов дней при интеграции с полем;
  по умолчанию используется id календаря. Идентификаторы корней остаются уникальными.
- Смена месяца/года и выбор месяца — внутреннее состояние представления, не новая
  модель выбранной даты. Изменение controlled value синхронизирует показанный месяц.
- Дата — локальные календарные части, не timestamp. Парсинг ISO не использует
  `new Date('YYYY-MM-DD')` и не переводит дату через UTC.

## Пример

```tsx
'use client';

import { useState } from 'react';
import { Calendar } from '@delba/ui';

export function AppointmentCalendar() {
  const [date, setDate] = useState('2025-01-15');

  return (
    <Calendar
      value={date}
      onValueChange={setDate}
      minValue="2025-01-10"
      maxValue="2025-02-20"
      aria-label="Дата встречи"
    />
  );
}
```

## Устройство

Calendar.tsx содержит композицию. Крупные визуальные части находятся в папках
со своими именами, не в общей parts/ui:

```text
Calendar/
  Calendar.tsx
  Calendar.model.ts
  Calendar.config.ts
  Calendar.types.ts
  Calendar.module.scss
  index.ts
  CalendarHeader/CalendarHeader.tsx
  CalendarHeader/CalendarHeader.module.scss
  CalendarMonths/CalendarMonths.tsx
  CalendarMonths/CalendarMonths.module.scss
  CalendarDays/CalendarDays.tsx
  CalendarDays/CalendarDays.module.scss
```

У каждой части типы входа расположены рядом с реализацией; собственный SCSS
и именованный класс на корне обязательны. Части не импортируют Calendar.module.scss.
Небольшая разметка без самостоятельной обязанности остаётся inline.
Calendar.model.ts предоставляет двери месяца, выбора и представления;
Calendar.config.ts задаёт повторяемую геометрию; Calendar.types.ts — публичные props.
Calendar.module.scss оформляет только корень; стили дней и навигации принадлежат частям; index.ts — вход компонента.
Общие алгоритмы дат принадлежат core/fields/date и используются также Input.
Стили портальной поверхности не находятся в Calendar.

## Приёмка

- Отображение и реальный выбор работают без Input и без popover/provider.
- Выбор отдаёт ISO и обновляется только через controlled value потребителя.
- Проверены включительные границы, disabled, месяц, год и смена месяца извне.
- Сохраняются клавиатурные действия и видимый фокус.
- Синхронизация с Input сохраняет прежний формат его модели, min/max, выбор,
  Escape без commit, Tab в панель, outside validation и документ якоря.
- Корневые exports, самостоятельный пример и каталог соответствуют типам.

[Реализация](../../../../src/components/Calendar/Calendar.tsx) ·
[Input](Input.md) · [Приёмка](../../verification/acceptance.md)

## Собственные стили частей

CalendarHeader, CalendarMonths и CalendarDays имеют каждый свой SCSS-модуль
в именованной папке и className={styles.Name} на существующем корне. Импорт
../Calendar.module.scss из частей запрещён. Стили части переносятся к владельцу;
общая механика использует токены и миксины ядра. Это выполненное устройство; браузерная приёмка выполняется в конце общей миграции.

При визуальной приёмке сравни computed-color обычного, недоступного, выбранного
и выходного дня с семантическими токенами темы. Базовый dayText не получает белый
!important: белый относится только к выбранному/активному состоянию.
