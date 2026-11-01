# Grid

Текущий договор, сверенный по исходнику; runtime-проверка отдельно.

## Назначение и применение

CSS-сетка для двумерной композиции. Используй для карточек и областей, которым нужны колонки, строки и размещение; одномерный поток проще выражать через [Flex](Flex.md).

## Основной API

- `columns`, `rows` — число треков из публичного диапазона 1–52; `gap`, `rowGap`, `columnGap` — промежутки.
- `justifyItems`, `alignItems`, `alignContent`, `autoFlow` задают размещение; допустимые слова определяются типами, например `row_dense`, а не CSS-строкой с пробелом.
- `children` с [GridItem](GridItem.md) — явная композиция. `areas` и `items`/`renderItem` — альтернативный договор описания раскладки; не нужно одновременно дублировать её вручную.
- `animate={{ when: 'change', effect: 'layout' }}` перестраивает keyed GridItem. Стабильные ключи — часть договора.
- `collapse` раскрывает всю сетку; общие геометрические пропсы и `container` принадлежат её корню.

## Пример

```tsx
import { Grid, GridItem } from '@delba/ui';

export function GridExample() {
  return <Grid columns={[3, 1, 2]} gap={[24, 12, 16]}>
    <GridItem key="model">Модель</GridItem>
    <GridItem key="price">Стоимость</GridItem>
    <GridItem key="delivery">Доставка</GridItem>
  </Grid>;
}
```

Responsive-порядок — desktop, mobile, tablet; `null` не переносит значение из первой позиции.

## Приёмка

Проверь количество колонок и переполнение длинным содержимым. При layout-движении проверь добавление, удаление и перестановку с сохранением ключей/фокуса, затем reduced motion. Сетка не должна менять смысловой DOM-порядок ради визуального расположения.

[GridProps и реализация](../../../../src/components/Grid/Grid.tsx) · [layout motion](../../../../src/components/Grid/layout.ts) · [приёмка](../../verification/acceptance.md).
