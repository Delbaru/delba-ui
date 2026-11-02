# CarouselTimer

Действующий публичный вход — `@delba/ui/carousel`.
Текстовое представление playback snapshot того же контроллера, что у NativeCarousel.

```tsx
'use client';

import { NativeCarousel, CarouselTimer, useCarouselController } from '@delba/ui/carousel';

export function TimedGallery() {
  const controller = useCarouselController();

  return (
    <section>
      <NativeCarousel label="Галерея" controller={controller} autoplay>
        <article>Первый слайд</article>
        <article>Второй слайд</article>
      </NativeCarousel>
      <CarouselTimer controller={controller} variant={['small', 'small', 'small']}
        format={snapshot => `${Math.ceil(snapshot.remaining)} с`} />
    </section>
  );
}
```

`format(snapshot)` возвращает строку. По умолчанию это оставшиеся секунды с округлением вверх.
Text-пропсы управляют типографикой; ref относится к Text-корню. Внутренний текстовый узел
обновляется только при изменении строки. Это не live region: тики не перебивают screen reader.
Таймер использует subscribePlayback и не запускает вторую модель времени.

Своя папка CarouselTimer, SCSS и класс CarouselTimer на существующем корне.
Приёмка: одинаковый deadline с CarouselProgress, hold/resume, смена format/controller,
unmount и отсутствие нежелательных объявлений screen reader. Браузер — после рефакторинга.

[Исходник](../../../../src/components/NativeCarousel/CarouselTimer/CarouselTimer.tsx) ·
[CarouselProgress](CarouselProgress.md) · [NativeCarousel](NativeCarousel.md).
