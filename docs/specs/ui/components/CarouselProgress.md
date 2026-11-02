# CarouselProgress

Действующий публичный вход — `@delba/ui/carousel`.
Индикатор времени autoplay одного NativeCarousel; не индикатор положения слайдов.

```tsx
'use client';

import { NativeCarousel, CarouselProgress, useCarouselController } from '@delba/ui/carousel';

export function TimedGallery() {
  const controller = useCarouselController();

  return (
    <section>
      <NativeCarousel label="Галерея" controller={controller} autoplay>
        <article>Первый слайд</article>
        <article>Второй слайд</article>
      </NativeCarousel>
      <CarouselProgress controller={controller} aria-label="Время до следующего слайда"
        w={['100%', '100%', '100%']} h={[4, 4, 4]} />
    </section>
  );
}
```

`controller` — тот же экземпляр, что у карусели. `fill` по умолчанию currentColor.
Layout и aria-label задаются Flex-пропсами; ref относится к существующему корню.
Корень имеет role=progressbar, aria-valuenow 0–100 и data-paused/data-playing.
Частые обновления двигают только transform заливки; весь экран не рендерится каждый кадр.
Компонент не создаёт свои часы. Подписка удаляется при замене контроллера/узла и unmount.

Своя папка CarouselProgress, SCSS и корневой класс CarouselProgress; SCSS родителя не импортируется.
Приёмка: старт, пауза/возобновление, смена слайда, замена controller и unmount.
Тест часов не подтверждает видимую заливку; браузерная проверка — на финальном этапе.

[Исходник](../../../../src/components/NativeCarousel/CarouselProgress/CarouselProgress.tsx) ·
[NativeCarousel](NativeCarousel.md).
