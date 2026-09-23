import { BREAKPOINT, MEDIA_QUERY } from './breakpoints';

/**
 * Масштаб кита: базовая ширина макета по полосам, `1rpx = ширина окна / база`. Одни числа
 * дают и CSS (`--rpx`, генерат `core/_scale.scss`), и JS (`sizes` у `Img`, генерат `core/scale.ts`):
 * `sizes` — атрибут HTML, `var()` в нём не работает. Проект задаёт их в `scale` своего `ui.config.ts`.
 */
export interface UiScale {
  /** База мобильной полосы, px макета. */
  readonly mobile: number;
  /** База планшетной полосы. */
  readonly tablet: number;
  /** База десктопа. */
  readonly desktop: number;
  /** Потолок десктопа: шире этого окна rpx больше не растёт. */
  readonly max: number;
}

export const DEFAULT_SCALE: UiScale = { mobile: 320, tablet: 768, desktop: 1920, max: 2560 };

export function resolveScale(override: Partial<UiScale> = {}): UiScale {
  const scale = { ...DEFAULT_SCALE, ...override };
  for (const [key, value] of Object.entries(scale)) {
    if (!(Number.isFinite(value) && value > 0)) throw new Error(`[ui] scale.${key} — положительное число, а не ${value}`);
  }
  return scale;
}

/** CSS-блок `--base-width` / `--rpx` по брейкпоинтам кита. */
export function scaleCss({ mobile, tablet, desktop, max }: UiScale): string {
  const band = (media: string, body: string) => `@media ${media} {\n  :root {\n${body}  }\n}\n`;
  const fluid = (base: number) => `    --base-width: ${base};\n    --rpx: calc(100vw / var(--base-width));\n`;
  return [
    band(MEDIA_QUERY.mobile, fluid(mobile)),
    band(MEDIA_QUERY.tablet, fluid(tablet)),
    band(
      MEDIA_QUERY.desktop,
      `    --base-width: ${desktop};\n    --base-width-max: ${max};\n    --base-width-max-px: ${max}px;\n` +
        '    --rpx: min(calc(100vw / var(--base-width)), calc(1px * var(--base-width-max) / var(--base-width)));\n',
    ),
  ].join('\n');
}

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
  const m = bandWidth(widths.mobile, scale.mobile, 'mobile');
  const t = bandWidth(widths.tablet, scale.tablet, 'tablet');
  const d = bandWidth(widths.desktop, scale.desktop, 'desktop');
  const cap = d.rpx === null ? [] : [`(min-width: ${scale.max}px) ${round((d.rpx * scale.max) / scale.desktop)}px`];
  return [
    `(max-width: ${BREAKPOINT.mobileMax}px) ${round(m.vw)}vw`,
    `(max-width: ${BREAKPOINT.tabletMax}px) ${round(t.vw)}vw`,
    ...cap,
    `${round(d.vw)}vw`,
  ].join(', ');
}
