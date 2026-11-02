# Video

Статус требований: базовый договор. Контракт прочитан в исходниках;
загрузка медиа и политика воспроизведения браузера отдельно не проверены.

## Назначение и выбор

HTML-видео в оболочке layout/motion кита: постер, размеры и необязательная кнопка запуска.
Используй для обычного ролика с нативными контролами или декоративного видео.
Собственный бар и внешний контроллер предоставляет [VideoPlayer](VideoPlayer.md).

## Основной договор

- `src` и `poster` — URL, объект `{ src }` либо кортеж `[desktop, mobile, tablet]`.
- Кортеж медиа выбирается в браузере: до монтирования URL отсутствует.
  `null` здесь означает каскад источника: телефон может получить планшетный,
  затем desktop. Это отдельное правило медиа, не общая нормализация layout.
- `controls=false`, `autoPlay=false`, `muted=false`, `playsInline=true`.
- `showPlayButton=false`; true добавляет кнопку запуска до начала воспроизведения.
- `objectFit` по умолчанию `cover`, `objectPosition` — `center`; оба значения поддерживают responsive-кортеж `[desktop, mobile, tablet]`.
- `w/h` и другие box-props управляют геометрией; `rootW/rootH` уточняют оболочку.
  Доступны `aspectRatio`, motion и нативные video-атрибуты/события.
- `ref` указывает на `HTMLVideoElement`, а className/style оформляют оболочку.

## Минимальный пример

```tsx
import { Video } from '@delba/ui';

export function Clip() {
  return (
    <Video
      src="/media/process.mp4"
      poster="/media/process.jpg"
      controls
      preload="metadata"
      aria-label="Процесс печати"
    />
  );
}
```

## Состояния и ограничения

При `showPlayButton` кнопка скрывается на play и возвращается на pause/ended.
Ошибка `play()` не гарантирует сообщение пользователю: нужный отказ оформляет потребитель.
Autoplay зависит от политики браузера; компонент не обещает успешный запуск.
Не добавляй автозапуск со звуком как обязательное условие сценария.
Для содержательного видео предусмотрите подходящие подписи/дорожки и доступное управление.
Для responsive-источников проверь смену URL при изменении ширины и поведение загрузки.

## Критерии приёмки

Проверь постер, play/pause/ended, клавиатуру контролов и доступное имя.
Проверь недоступный файл, отказ автозапуска, objectFit и размеры оболочки.
Если используется motion, отдельно проверь его фазы и reduced motion.

Договор: [VideoProps и реализация](../../../../src/components/Video/Video.tsx),
[VideoPlayer](VideoPlayer.md), [приёмка](../../verification/acceptance.md).

## Устройство после рефакторинга

Video.tsx соединяет оформление, motion и нативный video. Video.model.ts владеет
responsive source и состоянием optional play-overlay: media.source, media.playback,
media.events. Нативные play/pause/ended остаются источником playing; пользовательские
события вызываются после синхронизации overlay. Обещание play() может быть отклонено браузером.

Scalar src доступен при SSR; tuple ждёт hydration, чтобы телефон не скачивал desktop-ролик.
На mobile пропущенный кадр берётся из tablet, затем desktop; эта политика одинакова для poster.
Собственный Video.module.scss и класс Video принадлежат wrapper, VideoElement — реальному video.
Доступное имя кнопки задаёт ui.config.messages.video.open.
