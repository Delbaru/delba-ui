# Radio

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Один выбранный вариант внутри нативной группы radio с общим `name`.
Проектный D*-компонент закрепляет тему и размеры. Для независимых пунктов
используй Checkbox; компонент Radio не хранит модель всей группы.

## Основной API

- `name`, `value`, `checked`, `defaultChecked`, `disabled`, `required` — нативные props.
- `onChange(event)` получает событие input; `ref` — HTMLInputElement.
- `children` задаёт подпись, `indicator=true` управляет декоративным кругом.
- `tone`: `success`/`primary`; без tone CSS использует success-цвет точки.
- `size` — число, CSS-дефолт `20`; `dotSize` — число, CSS-дефолт `12`.
- `gap` по умолчанию `[8,null,null]`; responsive `null` — пропуск, не наследование.
- `state`, `linkState` и общие motion-props дополняют оформление/движение.

## Пример

Клиентский компонент; одинаковое name объединяет варианты:

```tsx
'use client';
import { useState } from 'react';
import { Radio } from '@delba/ui';

export function SideChoice() {
  const [side, setSide] = useState('left');
  return <fieldset><legend>Сторона</legend>
    <Radio name="side" value="left" checked={side === 'left'}
      onChange={() => setSide('left')}>Левая</Radio>
    <Radio name="side" value="right" checked={side === 'right'}
      onChange={() => setSide('right')}>Правая</Radio>
  </fieldset>;
}
```

## Состояния и ограничения

Checked и сменой модели группы управляет потребитель. `indicator=false` сохраняет
нативный input, но проект должен показывать выбор и фокус. `tone` не означает
проверку правильности ответа: смысл задаёт сценарий потребителя.

## Приёмка изменения

- В группе выбирается ровно один пункт; стрелки и Tab сохраняют нативный сценарий.
- Disabled, подписи, фокус и отправка name/value проверены в реальной форме.
- Оформление выбранного состояния и размеры читаемы на mobile.

[API](../../../../src/components/Radio/Radio.tsx) · [CSS-дефолты](../../../../src/components/Radio/Radio.module.scss) ·
[Checkbox](Checkbox.md) · [Приёмка](../../verification/acceptance.md)
