# Modal

Модальный диалог с overlay, стеком, фокусом и закрытием.
Используй для самостоятельного действия, которое временно блокирует фон.
Проектный D-компонент задаёт роль, размеры и оформление диалога.

## Основной договор

| Проп | Значение |
|---|---|
| `trigger` | Необязательный декларативный открывающий элемент |
| `open` + `onOpenChange` | Controlled-открытие; callback обязателен |
| `defaultOpen` | Начальное uncontrolled-открытие, false |
| `children` | Узлы или функция `(close) => ReactNode` |
| `layout` | Responsive `default | fullWidth`; default во всех диапазонах |
| `closeOn` | overlay/escape по умолчанию true; breakpoint закрывает при совпадении |
| `scroll` | Padding единственного внутреннего scroll-контейнера и scrollbar |
| `overflowVisible` | false; true снимает клип и требует прокрутки со стороны потребителя |
| `aria-label` / `aria-labelledby` | Доступное имя диалога |

`preset` — прежнее имя layout, deprecated; closeOn имеет приоритет над
legacy closeOnOverlayClick. `animate` задаёт общий motion; `animation` поддерживает
прежние fadeInUp/fadeInDown. Геометрия наследует BoxLayoutProps.

## Пример

```tsx
'use client';
import { Button, Modal, ModalProvider } from '@delba/ui';

export function Example() {
  return <ModalProvider>
    <Modal trigger={<Button>Открыть</Button>} aria-label="Подтверждение">
      {(close) => <>
        <p>Данные подготовлены.</p>
        <Button onClick={close}>Закрыть</Button>
      </>}
    </Modal>
  </ModalProvider>;
}
```

## Состояния и ограничения

[ModalProvider](ModalProvider.md) обязателен. Без trigger/open/defaultOpen Modal
работает как поверхность внутри useModal.present, а не самостоятельный opener.
Не смешивай два режима. Неактивные и закрывающиеся слои inert; управление фокусом
и возврат к прежнему элементу принадлежит киту. Закрытие сохраняет узел до exit.
Декларативный портал сохраняет контексты места объявления.

## Приёмка

Проверь Tab/Shift+Tab, Escape, overlay, доступное имя, возврат фокуса и два слоя.
Вложенный Dropdown должен закрыться раньше Modal. Проверь низкий viewport,
длинное содержимое, быстрый reopen и reduced motion.

Источник: [Modal.tsx](../../../../src/components/Modal/Modal.tsx).
Контракт из исходника; браузерная приёмка не заявлена.
