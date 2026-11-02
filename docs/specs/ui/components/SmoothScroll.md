# SmoothScroll

Статус требований: базовый договор. Типы и логика прочитаны в исходниках;
плавность, браузеры и взаимодействия нужно проверять на реальном экране.

## Назначение и выбор

Плавная прокрутка окна без Lenis: инерция колеса, якоря и публичный scrollTo.
Используй как единственного владельца плавности окна. LenisScroll и его provider
больше не входят в публичный API этой версии библиотеки.

## Основной договор

- `children` — содержимое; дополнительный DOM-контейнер провайдер не создаёт.
- `lerp` берётся из `motion.scroll.lerp` (база 0.08); `wheelMultiplier=1`.
- `duration` — секунды; по умолчанию из `motion.scroll`, без фиксированного значения
  перелёт рассчитан по расстоянию.
- `easing` берётся из `motion.scroll.easing` (база easeOutExpo); принимает функцию.
- `offset=0` — px, CSS-длина, имя CSS-переменной либо функция.
  Положительный `scroll-margin-top` элемента заменяет общий offset; отрицательный не применяется.
- `mobile=false`: вне desktop или на сенсорном экране колесо не перехватывается.
- `anchors=true`, `updateHash=true` включают якоря своей страницы и запись hash.
- `useSmoothScroll()` требует провайдера; Optional-вариант возвращает null без него.
  API: `scrollTo`, `stop`, живой `scrollY`, `subscribe(cb)` с отпиской.

## Минимальный пример

```tsx
'use client';
import { SmoothScroll, useSmoothScroll } from '@delba/ui';

function GoTop() {
  const { scrollTo } = useSmoothScroll();
  return <button type="button" onClick={() => scrollTo(0)}>Наверх</button>;
}

export function Page() {
  return <SmoothScroll offset="--header-height">
    <GoTop /><main>Содержимое страницы</main>
  </SmoothScroll>;
}
```

## Состояния и ограничения

scrollTo принимает число, HTMLElement, `#id` или CSS-селектор; к числу offset не применяется.
До эффекта создания движка fallback обрабатывает только числовую цель; ранний вызов
с HTMLElement/селектором не прокручивает. Это учитывается в эффектах дочернего компонента.
При reduced motion перелёт немедленный; на mobile по умолчанию нативный smooth.
Для исключения области из перехвата есть публичная константа `SMOOTH_SCROLL_IGNORE`
со значением `data-smooth-scroll-ignore`; вложенные скроллеры проверяются отдельно.
`scrollY` сам не обновляет React-render: используй subscribe и его cleanup.
Не запускай одновременно LenisScroll и SmoothScroll для одного окна.

## Критерии приёмки

Проверь колесо/тачпад, якорь с offset, stop, быстрый новый перелёт и изменение настроек.
Проверь клавиатуру, фокус, вложенные скроллеры, reduced motion и unmount.
Смена позиции должна сохранять нативную прокрутку, sticky и доступность содержимого.

Договор: [props и контекст](../../../../src/components/SmoothScroll/SmoothScroll.tsx),
[движок](../../../../src/components/SmoothScroll/engine.ts),
[приёмка](../../verification/acceptance.md).

## Устройство и единый владелец

SmoothScroll — provider без DOM: собственные SCSS/корневой wrapper ему не нужны.
SmoothScroll.types хранит публичные настройки и команды; компонент создаёт один
движок после mount, обновляет его configure без прерывания текущего хода,
регистрирует API в общем core scrollTo и освобождает регистрацию/движок при unmount.
Стабильная дверь useSmoothScroll возвращает scrollTo/stop/scrollY/subscribe.
Общая подписка scroll-events не копируется в каждом потребителе.

engine — низкий уровень окна: native wheel routing, позиция/кадры, якоря и cleanup.
Чистые расчёты clamp/lerp/offset/tween остаются в smooth-scroll и проверяются unit.
Эта необходимая алгоритмическая часть не размножается в UI-компонентах и не
переносится в общее ядро без второго реального потребителя.
Настройки времени/easing/offset/lerp читаются из motion.scroll; публичные override
экземпляра сохраняются. Подписка не обещает реактивный React-render scrollY.

[Публичные типы](../../../../src/components/SmoothScroll/SmoothScroll.types.ts).
