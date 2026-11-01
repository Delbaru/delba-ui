# LenisScrollProvider

Статус требований: базовый договор. Публичное имя подтверждено exports;
работа с экземпляром Lenis отдельно не проверена в браузере.

## Назначение и выбор

Мост от уже установленного ReactLenis к scroll-контексту DelbaUI.
Нужен при собственной интеграции Lenis. Готовый [LenisScroll](LenisScroll.md)
уже включает этот провайдер и выбирает нативную ветку, когда она нужна.

## Основной договор

- Публичное имя в `@delba/ui` — именно `LenisScrollProvider`.
- Единственный prop — обязательный `children`.
- Провайдер должен находиться внутри `Lenis` из `lenis/react` с `root`.
  Сам по себе он экземпляр Lenis не создаёт.
- `useLenisScroll()` требует контекста и бросает ошибку вне провайдера;
  `useLenisScrollOptional()` возвращает null вне контекста.
- `scrollY` — живой геттер без React-render; `registerScrollListener(cb)`
  принимает `(scrollY: number) => void` и возвращает отписку.
- `scrollTo(element | number, { offset? })` переводит к цели;
  `stopScroll?()` доступен в Lenis-ветке, но не обязателен в общем типе.

## Минимальный пример

```tsx
'use client';
import { Lenis } from 'lenis/react';
import { LenisScrollProvider, useLenisScroll } from '@delba/ui';

function GoTop() {
  const { scrollTo } = useLenisScroll();
  return <button type="button" onClick={() => scrollTo(0)}>Наверх</button>;
}

export function Page() {
  return <Lenis root options={{ autoRaf: true }}>
    <LenisScrollProvider><GoTop /></LenisScrollProvider>
  </Lenis>;
}
```

## Состояния и ограничения

До первого callback Lenis scrollTo использует нативную прокрутку.
Подписку очищает вызывающий компонент своей функцией cleanup.
Не сохраняй `scrollY` как автоматически обновляемый React-state.
`stopScroll()` вызывает `lenis.stop()` и останавливает движок целиком, а не только
текущий перелёт. Контекст не даёт start/resume: возобновлением владеет внешняя
Lenis-интеграция. Не используй его как краткую отмену без продуманного возобновления.
Внутренний `LenisScrollProviderNative` не экспортируется корнем пакета;
для готового выбора режима используй LenisScroll, не импорт внутренних файлов.

## Критерии приёмки

Проверь получение экземпляра, scrollTo с offset, остановку и очистку подписки.
Контекст не должен вызывать React-render каждого потребителя на каждом кадре скролла.
Проверь жизненный цикл внешнего Lenis и отсутствие второго владельца окна.

Договор: [контекст](../../../../src/components/LenisScroll/LenisScrollContext.tsx),
[публичные exports](../../../../src/index.ts),
[приёмка](../../verification/acceptance.md).
