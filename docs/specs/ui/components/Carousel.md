# Carousel

Статус требований: базовый договор. Карточка сверена с исходниками;
runtime и визуальная проверка этим документом не подтверждаются.

## Назначение и выбор

Лента слайдов на Swiper с единым API кита, responsive-настройками и внешними контролами.
Используй для галереи или последовательности карточек, которую пользователь листает.
Для непрерывной бегущей ленты предназначен [Marquee](Marquee.md).

## Основной договор

- `children` — слайды; компонент сам создаёт `SwiperSlide`.
- `slidesPerView` по умолчанию `[1, 1, 1]`, `gap` задаёт промежуток.
- Responsive-кортежи имеют порядок `[desktop, mobile, tablet]`.
- `orientation` — `horizontal` по умолчанию; `effect` — `slide`.
  Также доступны `fade`, `cube`, `coverflow`, `flip`.
- `drag` включён; `mousewheel`, `loop`, `centeredSlides` выключены.
- `speed` — 300 мс, `initialSlide` — 0 во всех полосах.
- `navigation` по умолчанию `none`, `pagination` — false. Контролы размещаются отдельно.
- `autoplay` выключен; true означает задержку 3000 мс, остановку после взаимодействия
  и паузу при наведении. Объект уточняет `delay` и `disableOnInteraction`.
- `apiRef` получает `prev`, `next`, `goTo`, `getNavigationState`;
  `onNavigationStateChange` сообщает доступность направлений.

## Минимальный пример

```tsx
'use client';
import { Carousel, CarouselDots } from '@delba/ui';

export function Gallery() {
  return <section>
    <Carousel carouselId="gallery" navigation={['dots', 'dots', 'dots']}>
      <div>Первый слайд</div><div>Второй слайд</div>
    </Carousel>
    <CarouselDots carouselId="gallery" />
  </section>;
}
```

## Состояния и ограничения

Контролы скрывают кнопки при отсутствии прокручиваемого содержимого.
`loop` зависит от количества слайдов; реализация может создавать копии.
`scrollBased` отключает drag; позицию ведёт внешний `scrollProgress` от 0 до 1.
Autoplay не имеет отдельного публичного пропа паузы; способ остановки и требования
reduced motion нужно проверить в сценарии потребителя, а не считать обеспеченными карточкой.

## Критерии приёмки

Проверь пустую, короткую и длинную ленту, края без loop, смену ширины, drag и кнопки.
Индекс и доступность контролов должны обновляться после каждого способа перехода.
Для autoplay проверь остановку, для эффектов — промежуточные фазы и reduced motion.

Договор: [типы](../../../../src/components/Carousel/types.ts),
[компонент](../../../../src/components/Carousel/Carousel.tsx),
[поведение](../../../../src/components/Carousel/useCarousel.ts),
[приёмка](../../verification/acceptance.md).
