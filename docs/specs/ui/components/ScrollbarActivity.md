# ScrollbarActivity

## Назначение

Подключить общую подсветку активности scrollbar для нативных областей,
оформленных scrollbarProps напрямую, включая html/body. ScrollArea подключает
тот же механизм самостоятельно; второй ScrollbarActivity рядом с ним не требуется.

## API и пример

Компонент без пропсов. Он не создаёт DOM, SCSS или фиктивный marker-контейнер:
результат render — null, эффект работает после клиентского mount.

```tsx
'use client';
import { ScrollbarActivity } from '@delba/ui';

export function ScrollbarEffects() {
  return <ScrollbarActivity />;
}
```

Это lifecycle-подключение, не scroll viewport. Оформление задаётся scrollbarProps
на реальном прокручиваемом элементе, а размеры и layout принадлежат потребителю.
Внутренний useScrollbarActivity() подключает ту же подписку для ScrollArea/Modal;
он не является дополнительным публичным export из корня пакета.

## Владение и очистка

useScrollbarActivity вызывает observeScrollbarActivity(document) в useEffect.
Реестр документа разделяет наблюдение между Modal, ScrollArea и явным подключением.
Cleanup освобождает одного подписчика; последний освобождает обработчики/таймеры.
SSR не обращается к document и не меняет разметку.

## Приёмка

Проверить нативную прокрутку и подсветку при scroll/hover/drag, несколько подписчиков
и последовательное размонтирование. Проверить, что последняя отписка снимает
ресурсы и не оставляет activity state. Фактическую отрисовку scrollbar проверяет
финальный Playwright-сценарий с включённым штатным scrollbar, не один computed CSS.

[Подключение](../../../../src/components/ScrollArea/ScrollbarActivity.tsx) ·
[Общий владелец](../../../../src/core/scrollbar-activity.ts) ·
[ScrollArea](ScrollArea.md).
