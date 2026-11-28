import type { ResponsiveDefinition } from './responsive-definition';
export type UiScale = ResponsiveDefinition;

const round = (n: number) => Math.round(n * 100) / 100;

/** Ширина картинки на полосе: число — в rpx, строка — только проценты окна. */
function bandWidth(value: number | string, base: number, ctx: string): { vw: number; rpx: number | null } {
  if (typeof value === 'number') return { vw: (value / base) * 100, rpx: value };
  const percent = value.trim().endsWith('%') ? Number(value.trim().slice(0, -1)) : NaN;
  if (!Number.isFinite(percent)) throw new Error(`[Img] width must be number(rpx) or percent for ${ctx}. Got: ${value}`);
  // Процент родителя пишется процентом окна: переоценка безопасна — кадр выйдет не мельче нужного.
  return { vw: percent, rpx: null };
}

/**
 * Атрибут `sizes` из ширин `[desktop, mobile, tablet]`: число — rpx, то есть `n / база` окна; на
 * десктопе шире потолка rpx замирает, и ширина там — `n × max / desktop` px.
 */
export function imageSizes(widths: { desktop: number | string; mobile: number | string; tablet: number | string }, scale: UiScale): string {
  const band = (name: 'desktop' | 'mobile' | 'tablet'): string => {
    const value = widths[name];
    if (typeof value === 'number' && scale[name].scale === 'fixed') return `${round(value)}px`;
    return `${round(bandWidth(value, scale[name].designWidth, name).vw)}vw`;
  };
  const desktop = bandWidth(widths.desktop, scale.desktop.designWidth, 'desktop');
  const cap = scale.desktop.scale === 'fluid' && desktop.rpx !== null
    ? [`(min-width: ${scale.desktop.scaleLimit}px) ${round((desktop.rpx * scale.desktop.scaleLimit) / scale.desktop.designWidth)}px`]
    : [];
  return [
    `(max-width: ${scale.tablet.minWidth - 1}px) ${band('mobile')}`,
    `(max-width: ${scale.desktop.minWidth - 1}px) ${band('tablet')}`,
    ...cap,
    band('desktop'),
  ].join(', ');
}
