# DurationPicker

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Выбор длительности двумя колёсами часов и минут. Значение — количество минут,
а не время суток. Проектный D*-компонент задаёт подписи, назначение и ограничения.
Для свободного числового ввода достаточно [Input](Input.md).

## Основной API

- `value` и `onValueChange(minutes)` — обязательный controlled-договор.
- `maxMinutes=1440` — включительная граница; значение округляется и ограничивается.
- `disabled=false` отключает оба колеса и убирает их из Tab-порядка.
- `aria-label='Duration'`, `labels={ hours: 'Hours', minutes: 'Minutes' }`.
- `className`, `ref` корневого Flex; произвольные layout props не принимаются.

## Пример

```tsx
'use client';
import { useState } from 'react';
import { DurationPicker } from '@delba/ui';

export function DurationExample() {
  const [minutes, setMinutes] = useState(90);
  return (
    <DurationPicker
      value={minutes}
      onValueChange={setMinutes}
      maxMinutes={480}
      aria-label="Длительность"
      labels={{ hours: 'Часы', minutes: 'Минуты' }}
    />
  );
}
```

## Состояния, ограничения и приёмка

Колёса поддерживают wheel, pointer drag, click и клавиатуру: ArrowUp/Down,
PageUp/Down, Home/End. У каждого колеса собственный spinbutton и доступное имя.
Переход за край ограничивает значение, не переносит время по кругу.

- Проверяй controlled-обновление и границы минут при последнем допустимом часе.
- Disabled не меняет значение ни одним способом ввода.
- Проверяй клавиатуру, pointer cancel, reduced motion и стабильный ref в потребителе.

[Реализация](../../../../src/components/DurationPicker/DurationPicker.tsx) ·
[Input](Input.md) · [Приёмка](../../verification/acceptance.md)
