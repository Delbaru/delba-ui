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

## Устройство после рефакторинга

VideoPlayer.tsx — вид и доступная семантика управления. VideoPlayer.model.ts соединяет
нативный контроллер и три связанные обязанности: timeline, volume, idle/click interaction.
Вид читает view.media/root/controls/timeline/volume; каждый ввод идёт через player-команды.
Таймлайн не выделяется в ещё один controller с множеством прокидываемых refs.
TimelinePreview и IconSwap — самостоятельные визуальные дети в именованных папках,
каждый со своим SCSS и корневым классом; stylesheet родителя они не импортируют.

Привязка controller отслеживает настоящий video-узел и снимает старые события при замене.
Fullscreen, native events и animation frames принадлежат ownerDocument медиа.
ratechange обновляет snapshot также при внешнем изменении HTMLVideoElement; emptied
снимает ready/duration/playing. Внутренние delayed click и hide timers отменяются при unmount.

Pointer-drag допускает одного инициирующего pointer; чужой pointer и всплывший lostcapture
потомка его не завершают. Собственная потеря capture/cancel завершает drag, пустой track
не создаёт NaN. Таймлайн и громкость сохраняют клавиатурный договор.

Тексты управления задаются в ui.config.messages.video; временные подписи используют
параметры current/duration/rate. Это настройка словаря, не готовая система локалей.
Корень VideoPlayer — Flex, его layout и радиусы выражаются существующими props.

## Настройка поведения один раз

`ui.config.motion.defaults.videoPlayer` задаёт autoHideDuration=2,
doubleClickDuration=0.22, controlsPollDuration=0.3, volumeStep=0.05,
timelineStep=5, timelinePageRatio=0.1 и driftTolerance=0.3.
Поля Duration принимают секунды или timing name. Общий генератор создаёт CSS и runtime
из одного словаря; компонент не держит числовой fallback рядом с настройкой.
События читают scoped CSS-переопределения у корня. controlsPollDuration имеет
внутренний scheduling floor 16 мс, чтобы нулевая настройка не создавала busy loop.
Явный driftToleranceSec у useSyncedPlayers перекрывает общий driftTolerance.

```ts
export default {
  motion: {
    timing: { normal: 0.5 },
    defaults: {
      videoPlayer: { autoHideDuration: 3, doubleClickDuration: 0.22, volumeStep: 0.1 },
    },
  },
};
```

Playback clock публикует кадры только при наличии subscribeTime-потребителей.
Последняя отписка останавливает rAF; подписка к уже играющему media запускает его снова.
useSyncedPlayers переподключает группу при смене участников, а не только master.
