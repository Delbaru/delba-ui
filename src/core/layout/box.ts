import {
  borderClasses,
  layoutSpaceClasses,
  radiusClasses,
  sizeClasses,
  type AspectRatioProps,
  type BorderStyleProps,
  type GrowProps,
  type LayoutSpaceProps,
  type RadiusPropsShort,
  type SizePropsShort,
  type PositionProps,
  type VisibilityProps,
} from '../base/shared-props';
import { resolveResponsive, type ResponsiveValue } from '../base/responsive';
import type { ClassBuilder } from './layout-classes';

/** Пропсы «коробки», которые одинаково понимает корень любого компонента. */
export interface BoxLayoutProps
  extends LayoutSpaceProps,
    SizePropsShort,
    RadiusPropsShort,
    BorderStyleProps,
    AspectRatioProps,
    GrowProps,
    PositionProps,
    VisibilityProps {
  /** Фон коробки на каждой полосе ширины. */
  bg?: ResponsiveValue<string>;
}

export const BOX_LAYOUT_KEYS = [
  'bg',
  'p', 'pt', 'pr', 'pb', 'pl',
  'm', 'mt', 'mr', 'mb', 'ml',
  'w', 'minW', 'maxW', 'h', 'minH', 'maxH',
  'r', 'tlr', 'trr', 'brr', 'blr', 'borderTLR', 'borderTRR', 'borderBRR', 'borderBLR',
  'border', 'borderC', 'borderS', 'borderW', 'borderT', 'borderR', 'borderB', 'borderL',
  'aspectRatio', 'grow',
  'position', 'top', 'bottom', 'left', 'right', 'hide',
] as const satisfies readonly (keyof BoxLayoutProps)[];

export type BoxLayoutKey = (typeof BOX_LAYOUT_KEYS)[number];

const BOX_LAYOUT_KEY_SET: ReadonlySet<string> = new Set(BOX_LAYOUT_KEYS);

// Обычный Omit объединяет ветки union и теряет связь multiple → value/onChange у Select.
type WithoutBoxLayout<P> = P extends unknown ? Omit<P, BoxLayoutKey> : never;

/**
 * Делит пропсы на «коробку» и остальное (остальное уходит на DOM-узел). Единственное место,
 * где нужны приведения: TypeScript не сужает тип ключа по членству в Set.
 */
export function splitBoxLayout<P extends BoxLayoutProps>(props: P): { box: BoxLayoutProps; rest: WithoutBoxLayout<P> } {
  const box: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (BOX_LAYOUT_KEY_SET.has(key)) box[key] = value;
    else rest[key] = value;
  }

  return { box: box as BoxLayoutProps, rest: rest as WithoutBoxLayout<P> };
}

/** Классы утилит корня из пропсов коробки. Не заданный проп ничего не добавляет. */
export function boxLayout(c: ClassBuilder, box: BoxLayoutProps): string[] {
  const hidden = box.hide === undefined ? undefined : resolveResponsive(box.hide);
  return [
    ...layoutSpaceClasses(c, box),
    ...radiusClasses(c, box),
    ...sizeClasses(c, box),
    ...c.value('bg', box.bg),
    ...borderClasses(c, box),
    ...c.value('ratio', box.aspectRatio),
    ...c.value('grow', box.grow),
    ...c.value('position', box.position),
    ...c.value('top', box.top),
    ...c.value('bottom', box.bottom),
    ...c.value('left', box.left),
    ...c.value('right', box.right),
    ...c.value('hide', hidden && [hidden[0] ? 'true' : null, hidden[1] ? 'true' : null, hidden[2] ? 'true' : null]),
  ];
}

/** Колонка контента страницы — одна на Flex, Grid и Box, а не свой вариант у каждого. */
export interface ContainerProp {
  /** Поля `--s-container` по бокам, `max-width: --width-container`, по центру на всю доступную ширину. */
  container?: boolean;
}

export const containerClass = (container: boolean | undefined) => (container ? 'ui-layout-container' : undefined);
