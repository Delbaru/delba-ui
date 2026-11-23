import type { LayoutSpaceProps, RadiusPropsShort } from '../core/base/shared-props';
import type { ResponsiveValue } from '../core/base/responsive';

// Движок шкур компонентов проекта: `defineSkin` описывает оси, умолчания и пресеты, `resolveSkin`
// собирает классы. Покой — глобальными классами осей (`sk_*`), состояния — `_states.scss`, который
// генератор (`tools/cli.mjs`) пишет из тех же пресетов. Словари осей — данные проекта.
// Файл без React и без SCSS: его импортирует и генератор в чистом Node.

export type AxisDict = Record<string, readonly string[]>;
export type AxisValues<A extends AxisDict> = { -readonly [K in keyof A]?: A[K][number] };
export type ScaleDict = Record<string, readonly number[]>;
export type ScaleValues<S extends ScaleDict> = { -readonly [K in keyof S]?: S[K][number] };
export type SkinValues<A extends AxisDict, S extends ScaleDict = Record<never, never>> = AxisValues<A> & {
  -readonly [K in keyof S]?: ResponsiveValue<number>;
};

type BorderName<A extends AxisDict> = Exclude<A['border'] extends readonly (infer B)[] ? B : never, 'none'>;

/** Глаголы движка, которые не оси: прозрачность, фильтр, курсор. */
export interface SkinEffects<A extends AxisDict> {
  opacity?: number;
  filter?: string;
  cursor?: string;
  pointerEvents?: 'none' | 'auto';
  /** Цвет рамки без пересборки border — имя линии из оси border. */
  borderColor?: BorderName<A>;
}

/**
 * Состояние. `pseudo` — модификатор селектора: hover/active/focus-visible привязаны к
 * псевдоклассу по умолчанию, disabled/checked — только по `pseudo: true`; `pseudo: false` оставляет
 * лишь `[state~='…']` (для «выбран», а не «нажат»). `guard` гасит состояние при другом токене.
 */
export type SkinStateStyle<A extends AxisDict> = AxisValues<A> & SkinEffects<A> & { pseudo?: boolean; guard?: string };

export type SkinPreset<A extends AxisDict, S extends ScaleDict = Record<never, never>> =
  AxisValues<A> & ScaleValues<S> & SkinEffects<A> & { states?: Record<string, SkinStateStyle<A>> };

export interface SkinDef<
  A extends AxisDict,
  P extends Record<string, SkinPreset<A, S>>,
  S extends ScaleDict = Record<never, never>,
> {
  axes: A;
  defaults?: AxisValues<A>;
  presets: P;
  /** Optional numeric axes supplied by a consumer. */
  scales?: S;
}

/** Keep literal axis/scale dictionaries and preset names through the pure definition. */
export const defineSkin = <
  const A extends AxisDict,
  const P extends Record<string, SkinPreset<A, S>>,
  const S extends ScaleDict = Record<never, never>,
>(def: SkinDef<A, P, S>) => def;

const skinClass = (axis: string) => (name: string) => `sk_${axis}_${name.replace(/-/g, '_')}`;
export const fillClass = skinClass('fill');
export const borderClass = skinClass('border');
export const textClass = skinClass('text');

/** Структура для резолвера: пресеты содержат оси и, опционально, шкалы. */
export interface SkinResolvable<
  A extends AxisDict,
  S extends ScaleDict,
  P extends Readonly<Record<string, object>>,
> {
  axes: A;
  defaults?: AxisValues<A>;
  presets: P;
  scales?: S;
}

/** Классы шкуры. Приоритет: проп инстанса > пресет > defaults. */
export function resolveSkin<
  A extends AxisDict,
  S extends ScaleDict = Record<never, never>,
  P extends Readonly<Record<string, object>> = Readonly<Record<string, object>>,
>(
  def: SkinResolvable<A, S, P>,
  styles: Readonly<Record<string, string>>,
  preset: keyof P | undefined,
  props: NoInfer<SkinValues<A, S>> = {},
) {
  const fromPreset: Readonly<Record<string, unknown>> | undefined =
    preset === undefined ? undefined : (def.presets[preset] as Readonly<Record<string, unknown>> | undefined);
  const defaults: Readonly<Record<string, unknown>> = def.defaults ?? {};
  const given: Readonly<Record<string, unknown>> = props;
  const axes: Record<string, unknown> = {};
  for (const key of [...Object.keys(def.axes), ...Object.keys(def.scales ?? {})]) axes[key] = given[key] ?? fromPreset?.[key] ?? defaults[key];

  const name = (key: string) => (typeof axes[key] === 'string' ? axes[key] : undefined);
  const fill = name('fill');
  const border = name('border');
  const text = name('textColor');

  return {
    axes: axes as SkinValues<A, S>,
    className: [
      styles.skin,
      fill && fillClass(fill),
      border && border !== 'none' && borderClass(border),
      text && textClass(text),
      preset !== undefined && styles[`skin-${String(preset)}`],
    ]
      .filter(Boolean)
      .join(' '),
  };
}

// ── Геометрия ────────────────────────────────────────────────────────────────

/** Ось геометрии на инстансе: слово словаря или кортеж `[d, m, t]`. Скаляр — на всех ширинах. */
export type ResponsiveAxis<T extends string> = T | readonly [T | null, T | null, T | null];

/** Паддинг словаря: одно число / [верт, гориз] / [верх, право, низ, лево]. */
export type SkinPad = number | readonly [number, number] | readonly [number, number, number, number];

export function axisAt<T extends string>(axis: ResponsiveAxis<T> | undefined, index: number): T | undefined {
  if (axis === undefined) return undefined;
  if (typeof axis === 'string') return axis;
  return axis[index] ?? undefined;
}

const tuple = <T extends string, V>(axis: ResponsiveAxis<T> | undefined, resolve: (name: T) => V) => {
  if (axis === undefined) return undefined;
  const at = (i: number) => {
    const name = axisAt(axis, i);
    return name === undefined ? null : resolve(name);
  };
  return [at(0), at(1), at(2)] as [V | null, V | null, V | null];
};

const toSpace = (pad: SkinPad) => (typeof pad === 'number' ? pad : [...pad]) as number | [number, number];

/** Паддинг: сырой `pad` инстанса > именованный `size` из словаря проекта. */
export const skinPad = <S extends string>(sizes: Readonly<Record<S, SkinPad>>, size?: ResponsiveAxis<S>, pad?: SkinPad): LayoutSpaceProps['p'] =>
  pad !== undefined ? [toSpace(pad), toSpace(pad), toSpace(pad)] : tuple(size, (name) => toSpace(sizes[name]));

/** Радиус из словаря проекта. */
export const skinRadius = <R extends string>(radii: Readonly<Record<R, number>>, radius?: ResponsiveAxis<R>): RadiusPropsShort['r'] =>
  tuple(radius, (name) => radii[name]);
