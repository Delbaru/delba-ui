# ModalProvider

Общий владелец стека модальных окон и блокировки прокрутки страницы.
Размещай над сценариями, открывающими Modal, обычно один раз в корне приложения.
У провайдера один проп — `children: ReactNode`.

## Публичный контекст

| API | Значение |
|---|---|
| `useModal().present(node, options?)` | Показывает узел, возвращает функцию закрытия именно этого окна |
| `useModal().dismiss()` | Закрывает верхний слой |
| `options.stackBehavior` | `stack` по смыслу default; `replace` заменяет стек новым узлом |
| `options.onClose` | Вызывается при начале закрытия |
| `useModalAction().dismiss()` | Закрывает своё окно из содержимого слоя |

useModal вне провайдера и useModalAction вне модального содержимого вызывают ошибку.
Декларативные [Modal](Modal.md) регистрируются в этом же стеке автоматически.

## Пример

```tsx
'use client';
import { Button, Modal, ModalProvider, useModal } from '@delba/ui';

function OpenDetails() {
  const { present } = useModal();
  return <Button onClick={() => {
    present(<Modal aria-label="Сведения">
      {(close) => <Button onClick={close}>Закрыть сведения</Button>}
    </Modal>);
  }}>Сведения</Button>;
}

export function Example() {
  return <ModalProvider><OpenDetails /></ModalProvider>;
}
```

## Состояния и ограничения

Стек содержит и закрывающиеся окна до окончания exit; scroll lock не снимается
раньше ухода последнего слоя. У presented-узла без Modal есть запасной таймер удаления;
его длительность читается из `motion.timing.normal` темы и включает общий
`MOTION_END_BUFFER_MS`. Поверхность Modal сообщает фактический срок по computed
transition/animation; её таймер заменяет запасной. Удаление и закрытие отменяют
ожидающий вход, а поколения кадров исключают поздний callback после unmount или
повторной регистрации того же ID.
Декларативные окна сохраняют React-контекст места объявления.
У imperative present узел рендерится под провайдером: локальный контекст вызывающего
поддерева автоматически туда не переносится.
Не используй внутренние registry/runtime hooks как публичный API.

## Приёмка

Проверь открытие A→B, закрытие B→A, dismiss при пустом стеке и повторное закрытие.
Проверь replace, callback ровно при фактическом запросе закрытия, body scroll
до/во время/после exit, unmount/remount декларации с тем же ID до первого кадра
и проверку, что старый кадр не открывает новое окно; также проверь cleanup кадров
при unmount провайдера и декларативный локальный контекст. Настрой timing.normal
длиннее 500 мс для plain presented node и проверь, что он удерживается до конца
запасного exit и снимает scroll lock только после удаления.

Источник: [ModalProvider.tsx](../../../../src/components/Modal/ModalProvider.tsx),
[scroll lock](../../../../src/components/Modal/scroll-lock.ts),
[публичные exports](../../../../src/components/Modal/index.ts).
Сверено по исходникам; browser/SSR прогон этим не подтверждён.
