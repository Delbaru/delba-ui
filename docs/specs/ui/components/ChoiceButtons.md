# ChoiceButtons

Статус: текущий договор; сверено с реализацией. Проверки — по критериям ниже и общей приёмке библиотеки.

## Назначение и применение

Короткий взаимоисключающий выбор: кнопки на desktop, Select на mobile/tablet.
Проектная D*-композиция задаёт вид набора и текст, сохраняя единую модель выбора.
Для длинного каталога вариантов удобнее напрямую использовать Select.

## Основной API

- `items`: readonly `{ value, label, description?, onSelect? }[]`.
- `value: T | null` — controlled; `defaultValue=null` — неуправляемый старт.
  Тип T выводится из items, в том числе из литералов `as const`.
- `onChange(value, item)` получает выбранное значение и полный пункт, не событие.
  `item.onSelect(value)` вызывается перед общим onChange.
- `disabled=false`, `required=false`; `name`, `form` подключают FormData.
- `className`, `itemClassName`, `buttonClassName`, `textClassName`,
  `infoClassName`, `tooltipClassName` оформляют соответствующие части.

## Пример

Клиентский компонент; литералы модели соответствуют items:

```tsx
'use client';
import { useState } from 'react';
import { ChoiceButtons } from '@delba/ui';

const items = [{ value: 'small', label: 'Малый' },
  { value: 'large', label: 'Большой' }] as const;
export function SizeChoice() {
  const [size, setSize] = useState<'small' | 'large' | null>(null);
  return <ChoiceButtons items={items} name="size" value={size}
    onChange={(value) => setSize(value)} />;
}
```

## Состояния и ограничения

`description` показывается в подсказке desktop-кнопки; mobile Select получает label.
Общий onChange вызывается только для найденного выбранного пункта, не для null.
Required обозначает обязательность, но не реализует серверную проверку формы.
Обе адаптивные формы читают одну модель; disabled исключает значение из FormData.

## Устройство и владельцы

Группа хранит единственное выбранное значение для desktop и Select; нативный
reset сбрасывает только неуправляемую модель, без onChange. Команда выбора
проверяет disabled перед item.onSelect и общим onChange.

`ChoiceButton/` отвечает за один desktop-вариант, `ChoiceInfoTooltip/` — за
скин подсказки поверх общих useTooltip и Tooltip. У частей собственные SCSS
и собственные корневые module-классы; родительские модули не импортируются.
Hover принадлежит CSS, отдельной React-модели наведённого значения нет.
Цвет иконки передаётся от выбранной кнопки через `--choice-info-color`.
Два адаптивных корня остаются соседями: обёртка ради маркера не добавляется.
Desktop-группа использует `hide={[false, true, true]}`, Select —
`hide={[true, false, false]}`. Это общий layout API; атрибутов `data-hide-*`
и соответствующих правил темы больше нет.

## Приёмка изменения

- При смене ширины выбор сохраняется, кнопки и Select возвращают одинаковый пункт.
- SSR передаёт классы hide на реальные корни обеих форм, не legacy-атрибуты.
- Callback вызывается один раз на выбор, disabled не меняет модель.
- В FormData одна запись выбранного name/value, подсказки не скрывают смысл выбора.

[API и реализация](../../../../src/components/ChoiceButtons/ChoiceButtons.tsx) ·
[Select](Select.md) · [Приёмка](../../verification/acceptance.md)
