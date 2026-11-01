# Dropdown

Выпадающая область рядом с триггером: действия, фильтр, небольшая форма.
Кит владеет открытием, позиционированием и клавиатурой; проект задаёт скин.
Содержимое не получает семантику menu автоматически.

## Основной договор

| Проп | Значение |
|---|---|
| `trigger` | Обязательный React-элемент с совместимыми событиями/ARIA |
| `children` | Узлы или функция `(close) => ReactNode` |
| `open` + `onOpenChange` | Controlled-режим; callback обязателен при open |
| `defaultOpen` | Начальное открытие uncontrolled-режима, по умолчанию false |
| `panel` | Пропсы поверхности и её размещения |
| `blockOutsideClick` | false; при true закрывающий клик не действует на страницу под панелью |
| `backdrop` | Необязательная не фокусируемая подложка |

По умолчанию panel: `side='start'`, `offset=8` дизайн-единиц,
`portal=false`, `matchTriggerWidth=false`, `keepMounted=true`.
`viewportPadding=8` измеряется в CSS px. `anchorRef` меняет геометрический якорь,
не триггер клавиатуры. `inheritVariables` переносит указанные CSS-переменные в портал.

## Пример

```tsx
'use client';
import { useState } from 'react';
import { Button, Dropdown } from '@delba/ui';

export function Actions() {
  const [open, setOpen] = useState(false);
  return <Dropdown open={open} onOpenChange={setOpen}
    trigger={<Button>Действия</Button>}
    panel={{ portal: true, p: [16, 16, 16] }}>
    {(close) => <Button onClick={close}>Закрыть список</Button>}
  </Dropdown>;
}
```

## Состояния и ограничения

Исходный onClick триггера выполняется первым; preventDefault отменяет переключение.
Disabled-триггер блокирует открытие. Закрытая панель inert и aria-hidden.
Escape закрывает слой; выход фокуса закрывает область. Ссылки внутри закрывают её.
Стрелки/Home/End работают с фокусируемыми пунктами, сохраняя ввод в полях.
Портал размещается возле активной Modal либо в body.

## Приёмка

Проверь клик/Tab/стрелки/Escape, возврат фокуса, внешний клик и вложенный Dropdown.
Проверь портал у края viewport и внутри Modal, оба режима владения open,
keepMounted=false и быстрый разворот анимации.

Источник: [Dropdown.tsx](../../../../src/components/Dropdown/Dropdown.tsx).
Текущий договор прочитан в исходнике; браузерный прогон не выполнен.
