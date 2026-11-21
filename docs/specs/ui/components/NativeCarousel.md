# NativeCarousel

Статус: действующий публичный API отдельного входа `@delba/ui/carousel`.
Браузерная приёмка выполняется после общего рефакторинга DelbaUI.

## Назначение

Карусель без Swiper и клонирования интерактивных детей. Команды, drag, клавиатура,
rewind, loop, инерция и autoplay используют один контроллер и один двигатель позиции.
Для существующего Swiper API используйте [Carousel](Carousel.md).

## Использование

```tsx
'use client';

import { NativeCarousel, CarouselNav, CarouselDots, useCarouselController } from '@delba/ui/carousel';

export function Gallery() {
  const controller = useCarouselController();

  return (
    <section>
      <NativeCarousel label="Галерея" carouselId="gallery" controller={controller}
        slidesPerView={[3, 1, 2]} gap={[24, 16, 20]}>
        <article>Первый слайд</article>
        <article>Второй слайд</article>
        <article>Третий слайд</article>
        <article>Четвёртый слайд</article>
      </NativeCarousel>
      <CarouselNav carouselId="gallery" />
      <CarouselDots carouselId="gallery" />
    </section>
  );
}
```

## Договор

- `label` обязателен; корень — focusable region, ref указывает на настоящий div.
- `children` сохраняют по одному mounted экземпляру, включая видео и формы.
- Один слайд остаётся видимым при первом измерении и resize, даже когда список
  страниц `[0]` не изменился. Доступность учитывает фактический размер viewport.
- `slidesPerView`, `gap`, `orientation` — `[desktop, mobile, tablet]`.
- `controller` необязателен: без него создаётся внутренний стабильный контроллер.
- `controller.prev/next/goTo` возвращают результат перехода; активная команда отменяется
  при новой команде или уничтожении двигателя. Снимок читается через `useCarouselSnapshot`.
- `loop` перемещает оригинальные слайды, требует больше слайдов, чем округлённое вверх
  slidesPerView. `rewind` означает видимый переход между краями, а не бесконечную петлю.
- `speed`, `autoplayDelay` — секунды или имя timing. Общие defaults берутся из
  `ui.config.motion.carousel` и `motion.defaults.carousel`.
- Drag не забирает поперечный touch-scroll; интерактивные дочерние элементы сохраняют ввод.
- Autoplay удерживается hover, фокусом, drag, невидимостью, скрытым документом и reduced motion.
- `pauseInactiveMedia` останавливает нативное медиа вне видимого диапазона, без автозапуска назад.
- Внешние CarouselNav/Dots связываются через carouselId и существующий общий реестр контролов.

## Владельцы и файлы

NativeCarousel.tsx соединяет layout, один immutable settings и lifecycle двигателя.
engine.ts владеет координатой, жестом, наблюдением, подписками и cleanup.
controller.ts владеет публичными командами и снимками, playback.ts — часами autoplay.
geometry/inertia/motion-progress/sync содержат самостоятельные алгоритмы, без второго
двигателя движения. Низкоуровневая математика не переносится в потребителя.
Внутри engine выбор назначения, нормализация прогресса, ограничение drag и
синхронизация доступности слайдов — именованные операции одного владельца.
Они не создают второе состояние позиции. Публикация снимка отдельно вызывает
обновление inert/focus/media; завершение жеста сначала фиксирует последний кадр,
затем выбирает инерцию, flick либо ближайшую страницу. Такой порядок сохраняется
при изменении архитектуры и проверяется настоящим pointer-вводом.
Корень имеет собственный NativeCarousel.module.scss и узнаваемый класс NativeCarousel.

## Приёмка

Пустая/короткая/длинная лента; дробные slidesPerView; loop через обе границы;
быстрый разворот; touch с поперечным scroll; собственные кнопки/поля в слайде;
controlled controller remount; изменение детей, размеров и ориентации;
autoplay hold/resume, reduced motion, inactive video, unmount и отмена команды.
Unit-проверки геометрии/контроллера/инерции/часов не заменяют эти браузерные сценарии.

[Реализация](../../../../src/components/NativeCarousel/NativeCarousel.tsx) ·
[контроллер](../../../../src/components/NativeCarousel/controller.ts) ·
[CarouselProgress](CarouselProgress.md) · [CarouselTimer](CarouselTimer.md).

Enhanced viewport сохраняет `overflow: hidden` для cross-axis focus-scroll. Двигатель
сбрасывает нативный offset только оси трека (`scrollLeft` горизонтально, `scrollTop`
вертикально), не меняя cross-axis offset: фокус на появляющемся поле
во время движения не должен добавлять нативный scrollLeft/scrollTop поверх
transform трека. Без JS сохраняется обычный scroll/snap fallback. Браузерная
приёмка фокусирует новое поле во время next и проверяет нулевой native offset.
