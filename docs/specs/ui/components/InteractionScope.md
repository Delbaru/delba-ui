# InteractionScope

Область активности для скрывающейся панели или тулбара.
Собирает указатель, фокус и активные дочерние контролы, включая портальные.
Кит сообщает факт активности; решение спрятать панель и её стили принимает проект.

## Основной договор

| Проп | Значение |
|---|---|
| `target` | Обязательный RefObject на HTMLElement/null области |
| `edge` | Необязательное top: активирует область при приближении мыши к верхнему краю |
| `onChange` | Уведомление boolean об активности |
| `children` | ReactNode или render-функция `(active) => ReactNode` |

`active = открытый дочерний контрол || указатель || фокус`.
Для fixed/sticky узла с top:0px верхняя зона определяется автоматически,
если edge не задан. Её высота следует за измеренной высотой target.

## Пример

```tsx
'use client';
import { useRef } from 'react';
import { Box, Button, Dropdown, InteractionScope } from '@delba/ui';

export function Toolbar() {
  const target = useRef<HTMLDivElement>(null);
  return <InteractionScope target={target}>
    {(active) => <Box ref={target} data-active={active || undefined}>
      <Dropdown trigger={<Button>Действия</Button>} panel={{ portal: true }}>
        {(close) => <Button onClick={close}>Закрыть</Button>}
      </Dropdown>
    </Box>}
  </InteractionScope>;
}
```

## Состояния и ограничения

`useInteractionActivity(active)` даёт собственному контролу способ удерживать
ближайшую область; при unmount удержание освобождается. Dropdown и декларативная
Modal сообщают активность сами. Вложенная область передаёт удержания родителю.
Портальные окна учитываются по React-контексту, а не DOM.contains.
Наведение считает mouse; touch/pointer других типов не имитирует hover.
Target должен быть смонтированным узлом: замена ref.current сама не перезапускает эффект.
Компонент не рисует DOM-оболочку и не предоставляет собственную анимацию скрытия.

## Приёмка

Проверь указатель, Tab внутрь/наружу, открытый портальный Dropdown при уходе мыши,
два одновременно активных контрола и unmount одного из них.
Удержание снимается только после закрытия последнего; верхняя зона возвращает
скрытую fixed-панель, не захватывая обычный touch-scroll.

Источник: [InteractionScope.tsx](../../../../src/core/InteractionScope.tsx).
Связанные компоненты: [Dropdown](Dropdown.md), [Modal](Modal.md).
Сверено по исходнику; взаимодействия в браузере ещё не подтверждены этой карточкой.
