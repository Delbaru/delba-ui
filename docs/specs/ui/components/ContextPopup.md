# ContextPopup

Контекстное меню у viewport-точки. Переиспользует Dropdown: portal, геометрию,
клавиатурную навигацию и возврат фокуса. Проект задаёт содержимое и оформление.

## Публичный договор

- `point: { x, y, opener }` задаёт координаты и реальный элемент вызова.
- Компонент открыт, пока смонтирован; `onClose` должен убрать его из дерева.
- `children` — содержимое меню, `label` — доступное имя (по умолчанию «Действия»).
- `panel` оформляет Dropdown, `boundary` ограничивает геометрию, `id` связывает trigger.
- `onOpen` вызывается при открытии и смене точки вызова.

```tsx
import { ContextPopup } from '@delba/frontend';
import type { ContextPoint } from '@delba/frontend';

export function Actions({ point, close }: { point: ContextPoint; close(): void }) {
    return (
        <ContextPopup point={point} onClose={close} label="Действия сообщения">
            <button type="button" onClick={close}>Закрыть</button>
        </ContextPopup>
    );
}
```

Нативная кнопка в примере показывает семантику содержимого; приложение использует
свой D-компонент. Поверхность имеет role=menu, initialFocus=first, fixed portal.
Escape, внешний клик, blur, resize и прокрутка предков закрывают меню;
прокрутка внутри поверхности сохраняет его. Клики внутри не всплывают наружу.

## Приёмка

Проверить открытие указателем и клавиатурой через реального инициатора, фокус
первого пункта и его возврат, Escape и внешний клик, прокрутку поверхности
и предков, resize, повторное открытие и nested popup. См. [Dropdown](Dropdown.md).

[Реализация](../../../../src/core/Popup/Context.tsx).
