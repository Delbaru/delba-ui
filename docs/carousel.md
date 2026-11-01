# Карусель

`@delba/ui/carousel` — отдельный вход собственной карусели без runtime-импортов
Swiper. Прежний `Carousel` из `@delba/ui` остаётся совместимым адаптером Swiper;
зависимость сохранена для остальных потребителей. Diamonds4You использует новый
компонент в `widgets/product-purchase/ui/ProductGallery.tsx`.

```tsx
import {
    NativeCarousel, CarouselDots, CarouselProgress, CarouselTimer,
    useCarouselController, synchronizeCarousels,
} from '@delba/ui/carousel';

const carousel = useCarouselController();

<NativeCarousel
    label="Фотографии"
    carouselId="photos"
    controller={carousel}
    slidesPerView={[2, 1, 1.5]}
    gap={[24, 12, 16]}
    orientation={['horizontal', 'horizontal', 'horizontal']}
    speed={0.3}
    loop
    inertia={{ duration: 0.6, maxSlides: 3, minimumVelocity: 150 }}
>
    {photos.map(photo => <Photo key={photo.id} photo={photo} />)}
</NativeCarousel>
<CarouselDots carouselId="photos" />
<CarouselProgress controller={carousel} h={[4, 4, 4]} />
<CarouselTimer controller={carousel} />
```

Один controller принадлежит одному смонтированному компоненту. В React его создаёт
`useCarouselController()`, вне React — `createCarouselController()`. DOM ref остаётся
обычным ref корня. Неподключённые команды завершаются безопасно без движения.

## Команды и переходы

`prev()`, `next()`, `goTo(page)` возвращают общий **тот же объект** `Transition`:
`await carousel.next()`, `.finished`, `.at()`, `.on('progress')`, `.cancel()`, `.reverse()`.
Он совместим с `motion.together()` и `motion.sequence()`. Новая команда прерывает
прежнюю с `{status: 'interrupted'}`. Отмена фиксирует ближайшую достижимую позицию;
reverse разворачивает текущий ход. Завершённый handle больше не меняет позицию.
Reduced motion сохраняет результат/lifecycle, но исключает само движение и инерцию.

`next/prev` — направленные команды: последовательные вызовы во время движения
сохраняют накопленную цель, даже через границу loop. Абсолютный `goTo` заменяет эту
цель и выбирает ближайший физический цикл. Прерывание сохраняет фактическую позицию
и учитывает текущую скорость, а не начинает каждый новый ход с покоя. Короткий тап
или жест поперёк оси не прерывает переход: захват начинается после порога drag.

Без loop индекс означает достижимую позицию: пять слайдов при трёх видимых дают
позиции 0, 1, 2. Последняя упирается в край содержимого без пустого хвоста. При loop
индекс соответствует исходному слайду и `pageCount === slideCount`.
`getSnapshot()`/`useCarouselSnapshot()` дают индекс, число позиций, `looping`, движение,
состояние autoplay и границы. Это дискретное состояние, не поток покадровых React renders.

## Положение ленты

`carousel.progress` читает фактическую позицию 0..1: вдоль конечного трека либо
циклически по полному обороту loop. Это **не** время autoplay и не временной progress
конкретного Transition. В loop переход через начало меняет значение с близкого к 1 на 0.
`carousel.seek(0.35)` немедленно ставит ленту между слайдами без snap; нечисловые значения
игнорируются, допустимые ограничиваются 0..1. Следующая команда продолжает от этой позиции.

```ts
let previous = carousel.progress;
const unsubscribe = carousel.subscribeProgress(progress => {
    if (previous < 0.5 && progress >= 0.5) onForwardHalfway();
    previous = progress;
});
// При уходе потребителя:
unsubscribe();
```

Для порога проверяется пересечение, а не `progress === 0.5`: кадр не обязан попасть
точно в значение. `subscribeProgress` подходит для внешнего DOM-индикатора или связи;
не передавайте каждое значение в состояние родителя всех слайдов. После отписки
уведомления прекращаются; remount переподключает слушателей к новому владельцу.

## Autoplay, прогресс времени и паузы

`play()` включает показ и снимает явную паузу. `pause()` сохраняет прошедшее время
до следующего `play()`. `stop()` выключает показ и сбрасывает интервал до нового `play()`.
Команды не обрывают текущий переход. `speed`, `autoplayDelay` и inertia duration задаются
в секундах либо именем timing; умолчания движения берутся из `motion.defaults.carousel`.
Минимальный autoplay-интервал — 0.1 секунды.

Вне экрана, в скрытом документе, при наведении мыши, фокусе внутри и во время движения
таймер удерживается, затем продолжает остаток. Reduced motion отключает автоматическое
продвижение. Keyboard/wheel ставят показ на явную паузу до `play()`. Конечная лента
останавливается в конце; `rewind` возвращается обычным видимым переходом.

`getPlaybackSnapshot()` возвращает `{progress, duration, elapsed, remaining, playing, paused}`.
Длительности здесь в **секундах**. `subscribePlayback()` обслуживает индикаторы:
`CarouselProgress` меняет только заливку, `CarouselTimer` — текст своего leaf.
Время ведёт один deadline; rAF существует только во время показа и при наличии
подписчиков на индикаторы. Пауза, остановка, последняя отписка и unmount снимают кадры.
Одинаковые callbacks могут регистрироваться независимо и имеют независимый cleanup.

## Loop, ось, drag и колесо

`loop` — бесшовное циклическое движение с **единственным DOM-экземпляром каждого
исходного слайда**, включая формы и видео. В движении оригиналы переставляются
transform только после полного выхода за клип. Для этого нужен запас:
`slideCount > ceil(slidesPerView)`. При недостатке слайдов остаётся конечная лента;
`getSnapshot().looping` явно сообщает фактический режим. Это не подмена loop на rewind.

`orientation` — responsive-кортеж horizontal/vertical. Вертикальной карусели задаётся
ограниченная высота. Drag/touch и стрелки клавиатуры следуют оси; Home/End доступны
обоим направлениям. Поперечные touch-жесты сохраняют нативное поведение. `mousewheel`
включается отдельно; без него не подключается блокирующий wheel listener, а конечные
края включённой ленты отпускают колесо странице.

`inertia` выключена по умолчанию. `true` включает стандартную проекцию по последним
100 мс pointer samples; объект задаёт максимум settling time, число дополнительных
позиций после отпускания и порог скорости в физических px/s. Проекция ограничена
краями/`maxSlides`; длительность и начальная скорость учитывают release velocity.
Медленное отпускание или пауза перед отпусканием не создают искусственного броска.
В reduced motion проекция выключена. Смена направления/команда/отмена/unmount
завершают предыдущий ход; накопленной очереди анимаций нет.

## Синхронизация и содержимое

```ts
useEffect(() => synchronizeCarousels([gallery, thumbnails]), [gallery, thumbnails]);
```

Это независимые контроллеры; число видимых слайдов может отличаться. Синхронизация
передаёт **исходный индекс**, не долю числа позиций. Лента из нескольких слайдов может
упереться в последнюю достижимую позицию; её clamp не передаётся обратно ведущей.
По умолчанию связь двусторонняя; `{bidirectional: false}` оставляет ведущим первый
controller. Возвращённый idempotent cleanup снимает подписки. Поздний mount и remount
подключаются к текущему намерению группы без обратных циклов уведомлений.

Скрытые слайды получают `inert`/`aria-hidden`, видимая часть дробного слайда доступна.
Фокус из скрывающейся области возвращается корню. По умолчанию скрытое native audio/video
приостанавливается; `pauseInactiveMedia={false}` передаёт эту политику потребителю.
Автоматического возобновления медиа нет. Для внешних плееров — `onIndexChange`.
У прежнего Swiper-адаптера для этого есть `onActiveIndexChange`: событие границ
`onNavigationStateChange` не заменяет смену слайда.

## Общие настройки в ui.config.ts

Один конфиг проекта задаёт общие defaults; проп конкретной карусели имеет приоритет.
`motion.carousel` содержит `drag`, `rewind`, `loop`, `orientation`, `mousewheel`,
`autoplay`, `inertia` и `pauseInactiveMedia`. Начальные значения сохраняют прежнее
поведение: горизонтальная лента с drag, без autoplay/loop/rewind/inertia/wheel,
с паузой скрытого native media. Направление по брейкпоинтам переопределяется
пропом `orientation={[desktop, mobile, tablet]}`.

`motion.defaults.carousel` задаёт времена в секундах или именах timing:
`duration`, `autoplayDelay`, `autoplayMinimumDuration`, `inertiaDuration`,
`inertiaMinimumDuration`, `dragSampleDuration`, `wheelCooldownDuration`.
Там же находятся `dragThreshold`/`flickDistance` в физических px,
`flickVelocity`/`inertiaMinimumVelocity` в px/s, `inertiaMaxSlides` и
`edgeResistance` (0..1). Генератор выпускает CSS и runtime из одного источника;
`motion.easing.carousel` задаёт общую кривую обычного перехода; проп `easing` переопределяет её.
SSR использует runtime, scoped CSS уточняет время и числовые пороги после mount.
Существующие конфиги могут не содержать новые поля: полный fallback определён
один раз в типизированных defaults кита, без отдельных чисел в движке.

`slidesPerView`, `gap`, `initialIndex`, содержимое, партнёры синхронизации и
callback остаются решениями экземпляра. У progress нет глобального «включить»:
чтение доступно всегда, подписка/индикатор сами владеют необходимой покадровой работой.
Численные допуски геометрии и коэффициенты математической кривой не являются
настройками поведения и остаются внутренними, с объяснением формулы.

## SSR и цена движения

Без JS все дети доступны в нативной scroll-snap ленте соответствующей оси.
После hydration позицией владеет transform-движок. Размеры обновляются при resize
и смене состава; drag группирует записи в кадр. Покой не содержит постоянного rAF.
Движение использует общие WAAPI/Transition/easing, независимо от reveal/parallax корня.
Loop кэширует детей, обходит их только при пересечении границы слота и пишет transform
лишь при изменении циклического смещения; геометрию в покадровом callback не читает.

Поддержаны counts 1/1.5/2/2.5/3/3.5/4/4.5/5/6, обычные box/motion-пропсы,
общие точки/миниатюры/стрелки. `auto`-ширины, scroll-progress driver и 3D/fade эффекты
пока принадлежат старому `Carousel`. Его удаление и удаление зависимости Swiper
не следуют из миграции одного сайта. Регрессии — `tools/browser/native-carousel*.spec.ts`;
unit-тесты геометрии/инерции/часов/контроллера/синхронизации входят в общий UI gate.
