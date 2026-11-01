# VideoPlayer

Статус требований: базовый договор. Основание — типы и исходники;
браузерное воспроизведение и fullscreen этим документом не подтверждены.

## Назначение и выбор

Плеер поверх [Video](Video.md) с таймлайном, громкостью и полноэкранным управлением.
Используй, когда нужен единый собственный бар либо внешний контроль воспроизведения.
Для простого HTML-видео с нативными контролами достаточно Video.

## Основной договор

- `src` и `poster` — строка либо `{ src }`; responsive-кортежи медиа не объявлены.
- `controller` — результат `useVideoPlayer`; без него создаётся внутренний контроллер.
- `apiRef` получает команды play/pause/toggle, seek/scrubTo, громкости, rate и fullscreen.
- `controls` — массив `play`, `timeline`, `time`, `rate`, `volume`, `fullscreen`.
  По умолчанию показаны все перечисленные, кроме `rate`.
- `rates=[1, 1.25, 1.5, 2]`; скорость переключается циклически при включённом `rate`.
- `interactive=true`; false убирает бар и управление кликом по видео для ведомого плеера.
- `label`, `labelIcon` подписывают источник; `preview={ src, from, to }` задаёт
  кадры таймлайна при внешнем медиа без `src` плеера. Время отрезка указано в секундах.
- Доступны размеры, радиусы, `objectFit`, `aspectRatio`; ref относится к корневому div.

## Минимальный пример

```tsx
'use client';
import { VideoPlayer, useVideoPlayer } from '@delba/ui';

export function Clip() {
  const controller = useVideoPlayer({ initialMuted: true });
  return <VideoPlayer
    controller={controller}
    src="/media/process.mp4"
    label="Процесс печати"
  />;
}
```

## Состояния и ограничения

Контроллер хранит ready/playing/volume/muted/duration/rate/fullscreen.
`time` — живое чтение без React-render; для обновлений есть `subscribeTime`.
Служебные `_attach/_detach` вызывает сам скин; потребителю не следует делать это вручную.
Не подменяй `controls` boolean-значением нативного video API.
Управляемое воспроизведение всё равно ограничено политикой браузера и доступностью файла.
Опции `useVideoPlayer` применяются при создании контроллера; смена `initialMuted`
не является controlled-обновлением. При внешнем `controller` автозапуск задаётся
его владельцем: `VideoPlayer.autoPlay` настраивает только внутренний fallback.

## Критерии приёмки

Проверь play/pause, drag и клавиатуру таймлайна, mute/volume, rate и fullscreen.
Фокус в контролах не должен теряться при скрытии бара; при `interactive=false`
проверь внешний контроллер. Отдельно проверь недоступное медиа и unmount.

Договор: [типы](../../../../src/components/VideoPlayer/types.ts),
[скин](../../../../src/components/VideoPlayer/VideoPlayer.tsx),
[контроллер](../../../../src/components/VideoPlayer/useVideoPlayer.ts),
[приёмка](../../verification/acceptance.md).
