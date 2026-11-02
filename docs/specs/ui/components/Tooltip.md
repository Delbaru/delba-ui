# Tooltip

Презентационная поверхность краткой подсказки в портале.
Используй для дополнительного объяснения возле фокусируемого триггера.
Важное условие действия оставляй видимым на экране, а не только в tooltip.

## Основной договор

| Проп | Значение |
|---|---|
| `portalNode` | HTMLElement/null; без узла ничего не рендерится |
| `style` | Координаты/стили, обычно из useTooltip |
| `placement` | Текущая сторона размещения |
| `active` | Видимость; связывает aria-hidden и state active |
| `surface` | true: встроенная поверхность; false для полностью проектного скина |
| `id` | ID для aria-describedby триггера |
| `children`, `className`, `ref` | Содержимое, оформление, ref поверхности |

`useTooltip()` даёт anchorRef, tooltipRef, anchorHandlers и bubbleProps.
Его defaults: enabled=true, direction=bottom, align=center, gap=8,
viewportPadding=8 px, lazyPortal=false, keepPositionWhenInactive=true.

## Пример

```tsx
'use client';
import { useId } from 'react';
import { Button, Tooltip, useTooltip } from '@delba/ui';

export function Help() {
  const id = useId();
  const tip = useTooltip<HTMLButtonElement, HTMLDivElement>({ direction: 'top' });
  return <>
    <Button ref={tip.anchorRef} {...tip.anchorHandlers}
      aria-describedby={tip.isActive ? id : undefined}>
      О параметре
    </Button>
    <Tooltip ref={tip.tooltipRef} id={id} {...tip.bubbleProps}>
      Параметр применяется ко всем деталям.
    </Tooltip>
  </>;
}
```

## Состояния и ограничения

Tooltip не устанавливает обработчики триггера и не выбирает якорь сам.
Поведение hover/focus и позицию даёт хук; ручной владелец может передать тот же договор.
Роль поверхности — tooltip. useTooltip не предоставляет focus trap, dismissal по
Escape или полноценную интерактивную popover-модель: для формы/действий выбери Dropdown.
SSR не создаёт portalNode до клиентского эффекта.

## Приёмка

Проверь hover и клавиатурный фокус, aria-describedby, край viewport и уход фокуса.
Перемещение/scroll не должны отрывать подсказку от якоря; уход сохраняет позицию
для fade-out. Проверь disabled через enabled=false и reduced motion.

Источник: [Tooltip.tsx](../../../../src/components/Tooltip/Tooltip.tsx),
[useTooltip](../../../../src/hooks/useTooltip.ts).
Исходники прочитаны; браузерная доступность отдельно проверяется в потребителе.

## Поверхность и переиспользование

Tooltip остаётся представлением модели useTooltip: позиционирование и lifecycle
не копируются в Button/Icon/Input. as='span' сохраняет inline host для таких контролов,
по умолчанию используется div через Flex. surface=false оставляет оформление
потребителю; общий Tooltip сохраняет портал, позицию, видимость и ARIA.
Корень несёт узнаваемый Tooltip и собственный Tooltip.module.scss.
Высота слоя задаётся общим --z-top, без отдельного числового этажа.
