# Grid

Текущий договор, сверенный по исходнику; runtime-проверка отдельно.

## Назначение и применение

CSS-сетка для двумерной композиции. Используй для карточек и областей, которым нужны колонки, строки и размещение; одномерный поток проще выражать через [Flex](Flex.md).

## Основной API

- `columns`, `rows` — число треков из публичного диапазона 1–52; `gap`, `rowGap`, `columnGap` — промежутки.
- `justifyItems`, `alignItems`, `alignContent`, `autoFlow` задают размещение; допустимые слова определяются типами, например `row_dense`, а не CSS-строкой с пробелом.
- `children` с [GridItem](GridItem.md) — явная композиция. `areas` и `items`/`renderItem` — альтернативный договор описания раскладки; не нужно одновременно дублировать её вручную.
- `animate={{ when: 'change', effect: 'layout' }}` перестраивает keyed GridItem. Стабильные ключи — часть договора.
- Появление использует `animate={{ when: 'inView', effect: 'up' }}`. Отдельный `reveal` удалён; [миграция](../../../motion-migration.md) сохраняет observer и каскад.
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

## Устройство и проверка рефакторинга

Grid описывает только host и композицию списка. Публичные типы находятся в Grid.types.ts; самостоятельная GridItem — в GridItem/GridItem.tsx с собственным SCSS. GridLayoutItems — DOM-free pre-commit мост для чтения старой геометрии до React commit; он не создаёт обёртку. Чистый layoutMoveFrames рассчитывает движение и сохраняет текущую opacity прерванного входа. Узлы, media и viewport относятся к ownerDocument host.

Именованный класс дополняет существующие ui-* классы без изменения семантического DOM. Пустой селектор может удаляться CSS Modules; явный маркер сохраняет имя без фиктивных CSS-деклараций. Проверка типов и unit-тесты не подтверждают внешний вид: финальная браузерная приёмка выполняется после объединения всей библиотеки.
