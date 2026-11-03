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
- `speed` — секунды или timing name; без значения используется motion.defaults.carousel.duration. `initialSlide` — 0 во всех полосах.
- `navigation` по умолчанию `none`, `pagination` — false. Контролы размещаются отдельно.
- `autoplay` выключен; true использует motion.defaults.carousel.autoplayDelay, остановку после взаимодействия
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

## Устройство после рефакторинга

Carousel.tsx читает carousel.root/layout/engine/slides. Типизированный engine.props
сверяется с SwiperProps; lifecycle и события Swiper не собираются вручную в JSX.
useCarousel остаётся единственным владельцем экземпляра Swiper, команд и
публикации navigation snapshot. Общие движение и контролы берутся из существующих
механизмов; параллельного двигателя листания здесь нет. ResizeObserver, computed style
и viewport берутся из ownerDocument корня.

Собственные Carousel.module.scss и корневой класс Carousel; CarouselNav/Dots имеют
свои модули. Доступные имена направлений задаются в ui.config.messages.carousel.
Для карусели без копирования интерактивных детей доступен отдельный
[NativeCarousel](NativeCarousel.md) из @delba/ui/carousel.

### Раскладка и адаптер движка

`Carousel.layout.ts` содержит чистую проекцию, а не второй hook состояния:

- `carouselLayout.measure` читает один снимок breakpoint/gap/width/slidesPerView
  из документа корня; одинаковый снимок не вызывает новое обновление React.
- `carouselLayout.resolve` выбирает responsive-параметры и считает peek-отступы
  из одного снимка. `scrollBased` запрещает drag независимо от responsive drag.
- `carouselLayout.slides` согласует обычную/нативную/дополненную петлю,
  начальную позицию и наличие внешних контролов. Существующий buildLoopSlides
  остаётся единственным владельцем копирования слайдов.

`Carousel.engine.ts` переводит эту проекцию в Swiper options: модули эффектов,
autoplay, freeMode, геометрия, accessibility и защита интерактивных детей от drag.
Время приходит уже разрешённым через общий useMotionTime, включая reduced motion;
адаптер не вводит второй источник длительностей. updateLayout согласованно
обновляет params/originalParams и сохраняет текущую позицию.

useCarousel хранит один React snapshot активного индекса и navigation. Синхронный
publishedRef отсеивает повторные события Swiper; это зеркало последней публикации,
не отдельный источник команд. Один publishState вызывается после init/update/
transition и изменения раскладки. onActiveIndexChange вызывается при изменении
логического индекса, onNavigationStateChange — при изменении или forced sync.
Все исходные callbacks Swiper, apiRef cleanup и scrollProgress сохранены.

Проверка изменения должна охватывать весь путь:

- [ ] Pure projection: responsive band, дробный peek, auto, пустой и короткий loop.
- [ ] Engine options: effect module, точные motion times, autoplay interaction,
  mousewheel releaseOnEdges и noSwipingSelector интерактивных детей.
- [ ] Browser: реальный drag/кнопки, внешние Nav/Dots и края, loop/index после
  смены ширины, все эффекты и reduced motion.
- [ ] Проверены consumer → useCarousel → layout/engine → Swiper callbacks;
  один источник измерения, экземпляра и публикации, без локального второго двигателя.
