# GridItem

Текущий договор, сверенный по исходнику; runtime-проверка отдельно.

## Назначение и применение

Ячейка [Grid](Grid.md) с явным размещением. Используй, когда ребёнок сетки занимает несколько треков, область или участвует в layout-анимации. Это нейтральный контейнер, а не готовая карточка проекта.

## Основной API

- `area` — именованная область; `colSpan` / `rowSpan` — размер в треках.
- `colStart`, `colEnd`, `rowStart`, `rowEnd` — линии сетки. Responsive-значения задаются `[desktop, mobile, tablet]`.
- `w`, `h`, `maxW`, `maxH` и отступы задают геометрию; `minW`/`minH` в публичный GridItemProps не входят. `justifyContent` / `alignItems` включают flex-выравнивание содержимого ячейки.
- `animate`, `perspective3d`, `parallax` — общая механика motion. Перестройку списка запускает `Grid.animate`, не локальный таймер ячейки.
- `ref` указывает на `div` ячейки. React `key` сохраняет её идентичность, а не передаётся в DOM.

## Пример

```tsx
import { Grid, GridItem } from '@delba/ui';

export function GridItemExample() {
  return <Grid columns={[3, 1, 2]} gap={[16, 12, 16]}>
    <GridItem key="main" colSpan={[2, 1, 1]}>Основное</GridItem>
    <GridItem key="aside">Дополнительно</GridItem>
  </Grid>;
}
```

## Приёмка

Ячейка не выходит за сетку при смене полосы и длинном содержимом. Проверь семантический порядок, стабильные ключи и ref. Для движения — перестановку, прерывание и reduced motion; CSS-позиционирование не заменяет доступный порядок чтения.

[GridItemProps и реализация](../../../../src/components/Grid/Grid.tsx) · [Grid](Grid.md) · [приёмка](../../verification/acceptance.md).
