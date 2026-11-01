# Checkbox

Статус: текущий договор; сверено с исходниками, без подтверждения runtime.

## Назначение и применение

Независимый выбор да/нет или пункт множественного выбора.
Проектный D*-компонент задаёт оформление и размеры; нативный checkbox и label
остаются у кита. Взаимоисключающие варианты относятся к Radio.

## Основной API

- `checked` + `onChange(event)`; значение читается через `event.currentTarget.checked`.
- `defaultChecked` задаёт неуправляемый старт; `name`, `value`, `required`, `disabled`
  сохраняют нативный договор input.
- `indeterminate=false` ставит DOM-свойство неполного выбора.
- `indicator=true`; отключение убирает декоративный квадрат, сохраняя input.
- `size` по умолчанию `[24,24,24]`, `iconSize` — `[16,16,16]`;
  `gap` — `[8,8,8]`, `alignItems='center'` или `start`.
- `children` — подпись; ref указывает на HTMLInputElement.

## Пример

Клиентский компонент; переключение не сохраняет данные на сервере само:

```tsx
'use client';
import { useState } from 'react';
import { Checkbox } from '@delba/ui';

export function ExtraOption() {
  const [checked, setChecked] = useState(false);
  return <Checkbox checked={checked}
    onChange={(event) => setChecked(event.currentTarget.checked)}>
    Добавить упаковку
  </Checkbox>;
}
```

## Состояния и ограничения

Indeterminate не заменяет модель checked. Для группы «выбрать всё» вычисление
агрегированного состояния принадлежит потребителю. `indicator=false` требует
сохранить понятное выбранное состояние в проектном оформлении.
Нативный readOnly checkbox сам по себе не является запретом переключения как disabled.

## Приёмка изменения

- Клик по подписи и Space меняют выбор; disabled не меняет его.
- Ref остаётся input, indeterminate отражается в DOM и доступном состоянии.
- Многострочная подпись и размеры проверены на mobile.

[API и реализация](../../../../src/components/Checkbox/Checkbox.tsx) ·
[Radio](Radio.md) · [Приёмка](../../verification/acceptance.md)
