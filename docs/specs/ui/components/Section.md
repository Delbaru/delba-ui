# Section

Текущий договор, сверенный по исходнику; runtime-проверка отдельно.

## Назначение и применение

Семантический `<section>` для тематической области страницы. Используй с заголовком или доступным именем. Для нейтральной коробки — [Box](Box.md); проектная DSection может задать повторяемую композицию и тему.

## Основной API

- `children`, `id`, `aria-*`, DOM-события и `ref` относятся к секции.
- Геометрия намеренно ограничена: `mt`, `mb`, `pt`, `pb`, размеры/min/max, `aspectRatio`, `grow`, `bg`. Горизонтальные отступы полного Box в SectionProps не входят.
- `animate`, `perspective3d`, `parallax` — общая механика движения.
- `className`, `style`, `linkState` дополняют оформление/связь состояний; стили проекта не переносятся в библиотеку.

## Пример

```tsx
import { Section, Text } from '@delba/ui';

export function SectionExample() {
  return <Section aria-labelledby="delivery-title" pt={[32, 16, 24]}>
    <Text as="h2" id="delivery-title">Доставка</Text>
    <Text as="p">Способ получения заказа</Text>
  </Section>;
}
```

## Приёмка

Проверь доступное имя секции, правильную иерархию заголовков и уникальность id при повторном использовании. Геометрия проверяется на всех полосах; движения — с reduced motion. Не выбирай Section только ради декоративного отступа.

[SectionProps и реализация](../../../../src/components/Section/Section.tsx) · [композиция](../components.md) · [приёмка](../../verification/acceptance.md).
