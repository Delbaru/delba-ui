# Modal

Модальный диалог с overlay, стеком, фокусом и закрытием.
Используй для самостоятельного действия, которое временно блокирует фон.
Проектный D-компонент задаёт роль, размеры и оформление диалога.

## Основной договор

| Проп                             | Значение                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `trigger`                        | Необязательный декларативный открывающий элемент                                                                                 |
| `open` + `onOpenChange`          | Controlled-открытие; callback обязателен                                                                                         |
| `defaultOpen`                    | Начальное uncontrolled-открытие, false                                                                                           |
| `children`                       | Узлы или функция `(close) => ReactNode`                                                                                          |
| `layout`                         | Responsive `default                                                                                                              | fullWidth`; default во всех диапазонах |
| `closeOn`                        | overlay/escape по умолчанию true; breakpoint закрывает при совпадении                                                            |
| `scroll`                         | Padding единственного внутреннего scroll-контейнера; `scroll.scrollbar` настраивает scrollbar и по умолчанию следует `ui.config` |
| `controls`                       | Элементы управления вне внутренней прокрутки, внутри focus boundary диалога; например, внешний крестик |
| `overflowVisible`                | false; true снимает клип и требует прокрутки со стороны потребителя                                                              |
| `aria-label` / `aria-labelledby` | Доступное имя диалога                                                                                                            |

`preset` — прежнее имя layout, deprecated; closeOn имеет приоритет над
legacy closeOnOverlayClick. Объектный `animate` задаёт motion открытия/закрытия;
`animation` удалён. Геометрия наследует BoxLayoutProps.

## Пример

```tsx
'use client';
import { Button, Modal, ModalProvider } from '@delba/ui';

export function Example() {
  return (
    <ModalProvider>
      <Modal trigger={<Button>Открыть</Button>} aria-label="Подтверждение">
        {(close) => (
          <>
            <p>Данные подготовлены.</p>
            <Button onClick={close}>Закрыть</Button>
          </>
        )}
      </Modal>
    </ModalProvider>
  );
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

## Внутренние границы

Modal — декларативное подключение к стеку провайдера. ModalSurface/ModalSurface.tsx
владеет единственным визуальным root и собственным SCSS; чистому адаптеру Modal
не добавляют искусственный DOM. ModalSurface.model владеет входом/возвратом фокуса,
Tab trap, Escape и временем exit. Документ и кадры выбираются из документа панели.
Портальные Dropdown внутри того же слоя входят в Tab-область. DeclarationSlot
сохраняет существующий display:contents host и имеет свои SCSS/маркер.

Современный вызов: animate={{ when: 'open', effect: 'fade', duration: 'fast' }}.
Прежний `animation` заменяется этим договором: `fadeInUp` → effect `up`,
`fadeInDown` → effect `down`. Состояние open и ожидание exit остаются у Modal.
ModalProvider владеет единственной двухкадровой фазой входа: она отделяет скрытый
DOM от включённого перехода. ModalSurface использует этот `open` без второго rAF.
Закрытие, повторная регистрация ID и unmount отменяют вход; при закрытии узел и
scroll lock остаются до измеренного CSS exit.

Единственный inner scroll-host использует Box с блочным потоком: переключение на
Flex column без запрета shrink у содержимого сжимает длинные блоки и убирает overflow.
Проверка должна подтверждать scrollHeight>clientHeight и настоящий wheel scrollTop,
а не только наличие overflow-y:auto в CSS.

`controls` располагаются относительно панели. Их наличие разрешает выход за её
границы, сохраняя прокрутку контента в единственном inner scroll-host. Потребитель
оставляет место во viewport для внешнего действия и задаёт его доступное имя.
На узком экране действие можно расположить внутри панели responsive-пропсами.
Проверь Tab, Escape, overlay и хит-тест внешней кнопки после прокрутки.
