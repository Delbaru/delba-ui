# CarouselNav

Статус требований: базовый договор. Описан контракт исходников;
наличие карточки не подтверждает браузерную проверку.

## Назначение и выбор

Пара стрелок для перехода назад и вперёд в [Carousel](Carousel.md).
Используй вместе с лентой; это не универсальная навигация между страницами сайта.
Прямой выбор страницы обеспечивает [CarouselDots](CarouselDots.md).

## Основной договор

- `carouselId?: string` — явная привязка к `Carousel.carouselId`.
- `className?: string` — дополнительное оформление корня.
- Других публичных props у `CarouselNav` нет: layout-props Flex не наследуются.
- На карусели включи `navigation` со значением `arrows` или `both`
  в нужных responsive-полосах.
- Без `carouselId` контрол ищет ближайшую карусель через DOM;
  при нескольких лентах явная связь предотвращает неоднозначность.
- Класс `Carousel.navigationClassName` также попадает на корень навигации.

## Минимальный пример

```tsx
'use client';
import { Carousel, CarouselNav } from '@delba/ui';

export function Gallery() {
  return <section>
    <Carousel carouselId="works" navigation={['arrows', 'arrows', 'arrows']}>
      <div>Работа 1</div><div>Работа 2</div>
    </Carousel>
    <CarouselNav carouselId="works" />
  </section>;
}
```

## Состояния и ограничения

Кнопки появляются только при разрешённой навигации и достаточном количестве слайдов.
Обёртка остаётся и без кнопок. Disabled берётся из состояния самой карусели.
Стандартные кнопки имеют тип `button` и русские доступные имена направлений.
Стрелки используют встроенный ресурс arrows/arrow_bold.svg; доступность этого ресурса
и его соответствие теме проверяются в приложении потребителя.
Собственные иконки или render-функция публичным API не предусмотрены.

## Критерии приёмки

Проверь оба направления, disabled на границах без loop, обновление после drag,
клавиатуру и отсутствие отправки окружающей формы при нажатии.
С двумя каруселями каждая пара должна управлять своей лентой.

Договор: [реализация и props](../../../../src/components/Carousel/CarouselNav/CarouselNav.tsx),
[связь контролов](../../../../src/components/Carousel/controls.ts),
[приёмка](../../verification/acceptance.md).

## Владение и оформление

CarouselNav использует общий controls registry для Carousel и NativeCarousel.
Disabled и команды принадлежат карусели; у пары стрелок нет второго индекса.
Свои CarouselNav.module.scss и класс CarouselNav, без импорта стилей родителя.
Тексты направлений задаются ui.config.messages.carousel.previous/next.
