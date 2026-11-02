# ToastProvider

Краткий ответ на выполненное действие без собственного экрана результата.
Используй для подтверждения операции или отказа, который нельзя адресовать полю.
Ошибку значения формы показывай рядом с полем.

## Основной договор

Провайдер принимает `children: ReactNode`.
`useToast()` возвращает `show(options): void`; вне провайдера хук вызывает ошибку.

| Поле ToastOptions | Значение |
|---|---|
| `title` | Обязательный короткий результат действия |
| `description` | Необязательная подробность, не повтор заголовка |
| `tone` | success по умолчанию, warning или error |
| `durationMs` | Время до начала скрытия; по умолчанию 4000 мс |

Тон меняет глиф и цвет его кружка; карточка остаётся общей.
Одновременно открыто максимум пять тостов: следующий закрывает самый старый.
ToastProvider располагается снаружи ModalProvider, чтобы модальные сценарии
и их портальные узлы использовали тот же контекст.

## Пример

```tsx
'use client';
import { Button, ModalProvider, ToastProvider, useToast } from '@delba/ui';

function CopyLink() {
  const toast = useToast();
  return <Button onClick={async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.show({ title: 'Ссылка скопирована' });
    } catch {
      toast.show({ title: 'Не удалось скопировать ссылку', tone: 'error' });
    }
  }}>Скопировать ссылку</Button>;
}

export function Example() {
  return <ToastProvider>
    <ModalProvider><CopyLink /></ModalProvider>
  </ToastProvider>;
}
```

## Состояния и ограничения

Стек выводится в body после клиентского эффекта с role=status/aria-live=polite.
Скрытие сначала сворачивает карточку, затем удаляет узел; таймеры очищаются при unmount.
warning означает принятый, но не выполненный ход; success не должен обещать
операцию, которую вызывающий ещё не завершил. show не возвращает ID или dismiss-команду.

## Приёмка

Проверь три тона, title без description, шестой тост, автоудаление и unmount.
После реального отказа не должен появляться success. Проверь объявление результата
средством чтения экрана, движение соседей и reduced motion.

Источник: [ToastProvider.tsx](../../../../src/components/Toast/ToastProvider.tsx).
Договор из исходника; браузерный и assistive-tech прогон здесь не выполнены.

## Архитектура

ToastProvider подключает контекст и выводит портал; useToastQueue единолично
владеет списком, ID, таймерами и командами. API контекста стабилен при изменении
карточек: уведомление не заставляет всех подписчиков получать новый show.
ToastCard/ToastCard.tsx отвечает за оформление и collapse одной карточки;
собственный ToastCard.module.scss не импортирует стиль провайдера.
Портальная стопка имеет маркер ToastProvider и свой ToastProvider.module.scss.
Карточка имеет маркер ToastCard. Провайдер не добавляет DOM вокруг children.

appendToast закрывает самые старые открытые карточки, сохраняя их в DOM до конца
collapse. Ограничение учитывает только открытые карточки; уже закрывающиеся
не вытесняют новые. remove очищает таймер и удаляет карточку после exit.
При unmount все таймеры очищаются. Значения 4000 мс и лимит пять принадлежат
локальному Toast.config; вызывающий меняет длительность экземпляра durationMs.

Публичная дверь остаётся useToast().show(options). Process-global toast/очередь
не добавлялись: несколько providers сохраняют независимые очереди.
Unit проверяет лимит и удержание закрывающейся карточки. Финальная проверка
Playwright дополнительно подтверждает enter/exit, соседей и reduced motion.

[Модель очереди](../../../../src/components/Toast/Toast.model.ts) ·
[Карточка](../../../../src/components/Toast/ToastCard/ToastCard.tsx) ·
[Типы](../../../../src/components/Toast/Toast.types.ts).
