'use client';

import type { CSSProperties, ForwardRefExoticComponent, Ref, RefAttributes } from 'react';

import { resolveSkin, type AxisDict, type AxisValues } from './index';
import type { GrowProps, ResponsiveValue, SizePropsShort } from '../core';


// ─────────────────────────────────────────────────────────────────────────────
// ЯДРО СКИНА (вторая половина эталона; первая — core/axes.ts, словарь значений).
//
//   defineSkin(...) → описание компонента: оси, дефолты, пресеты.
//   useSkin(def, …) → механика: резолв осей → классы, ref-якорь, геометрия.
//                     Компоненту остаётся разложить оси по пропам своего атома.
//
// Резолв: явный проп инстанса > пресет > defaults.
// `defaults` — РАНТАЙМ-дефолты. Ось без дефолта не эмитится вовсе (undefined ≠ 'none').
//
// CSS, который знает ядро: .skin (базовый класс), .sk_fill_*/.sk_border_*/.sk_text_*
// (глобальные классы осей цвета), .skin-<пресет> (состояния, машинная зона module.scss).
//
// Отличие от эталона: dev-панель (DevLab) не переносилась — нет `edit`/`lab`/манифеста.
// Форма описания сохранена, чтобы панель можно было навесить позже без переписывания.
// ─────────────────────────────────────────────────────────────────────────────

export type SkinComponent<P, E = HTMLElement> = ForwardRefExoticComponent<P & RefAttributes<E>>;

// ── Описание компонента ──────────────────────────────────────────────────────

export type { AxisDict, AxisValues } from './index';
export type ScaleDict = Record<string, readonly number[]>;


/** Шкала в ПРЕСЕТЕ: строго ступенька лестницы — мимо SPACE не пройдёт. */
export type ScaleValues<S extends ScaleDict> = { -readonly [K in keyof S]?: S[K][number] };

/** Оси и шкалы инстанса. Шкалы свободнее, чем в пресете: gap responsive. */
export type SkinProps<A extends AxisDict, S extends ScaleDict> = AxisValues<A> & {
  -readonly [K in keyof S]?: ResponsiveValue<number>;
};

/**
 * «Эффекты» — глаголы движка base()/states() из _axes.scss, которые НЕ являются осями
 * КОНКРЕТНОГО компонента: покраска глифа, прозрачность, тень, курсор. Общий словарь.
 *
 * ⚠️ В рантайме useSkin их НЕ читает (их нет в axes) — они только ВХОД кодогена:
 * уезжают в @include base(...) / @include states(...) машинной зоны SCSS.
 */
export interface SkinEffects {
  iconColor?: string;
  iconStroke?: string;
  iconFill?: string;
  iconOpacity?: number;
  /** border-color БЕЗ пересборки border: толщина/стиль resting-рамки сохраняются. */
  borderColor?: string;
  opacity?: number;
  cursor?: string;
  pointerEvents?: 'none' | 'auto';
  /** Единственные тени системы: 'pop' — всплывающий слой, 'focus' — кольцо фокуса. */
  shadow?: string;
}

/**
 * Стиль состояния — оси компонента + эффекты, тем же словарём, что и покой.
 *
 * ⚠️ `pseudo` — не стиль, а модификатор СЕЛЕКТОРА: движок по умолчанию вешает
 * hover/active/focus-visible на нативный псевдокласс, а state='active' в админке
 * почти всегда значит «ВЫБРАН», а не «нажат» → таким пресетам нужен `pseudo: false`.
 *
 * `guard` — второй модификатор: подавляет состояние, когда взведён другой токен
 * (`guard: 'active'` → hover не мигает на выбранном пункте).
 */
export type SkinStateStyle<A extends AxisDict> = AxisValues<A> & SkinEffects & { pseudo?: boolean; guard?: string };
export type SkinStates<A extends AxisDict> = Record<string, SkinStateStyle<A>>;

/** Пресет (роль): комбинация осей + эффектов под одним именем + свои состояния. */
export type SkinPreset<A extends AxisDict, S extends ScaleDict> = AxisValues<A> &
  ScaleValues<S> &
  SkinEffects & {
    w?: string | number;
    h?: string | number;
    /** Булев — «роль тянется». В число для атома превращает ядро. */
    grow?: boolean;
    states?: SkinStates<A>;
  };

export interface SkinConfig<A extends AxisDict, S extends ScaleDict> {
  /** Имя компонента — для отладки и будущей dev-панели. */
  component: string;
  /** Как зовётся проп-пресет ('skin' у бокса, 'variant' у полей). */
  presetProp: string;
  axes: A;
  /** Оси, которой тут нет, при незаданности не будет и в пропах атома. */
  defaults?: AxisValues<A>;
  scales?: S;
  presets: Readonly<Record<string, SkinPreset<A, S>>>;
}

export type SkinDef<A extends AxisDict, S extends ScaleDict> = SkinConfig<A, S>;

export function defineSkin<A extends AxisDict, S extends ScaleDict>(config: SkinConfig<A, S>): SkinDef<A, S> {
  return config;
}

// ── Хук ──────────────────────────────────────────────────────────────────────

// Геометрия у всех атомов дома одна — берём домовые типы, а не тащим дженериками.
type SkinW = SizePropsShort['w'];
type SkinH = SizePropsShort['h'];
type SkinGrow = GrowProps['grow'];

export interface UseSkinArgs<A extends AxisDict, S extends ScaleDict> {
  /** CSS-модуль компонента: отсюда .skin и .skin-<пресет>. */
  styles: Record<string, string>;
  preset?: string;
  /** Явные оси и шкалы инстанса. undefined-ключи = «не задано». */
  props: SkinProps<A, S>;
  w?: SkinW;
  h?: SkinH;
  grow?: SkinGrow;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

export interface UseSkinResult<A extends AxisDict, S extends ScaleDict> {
  axes: SkinProps<A, S>;
  /**
   * Только классы СКИНА. className инстанса ядро не принимает: у половины компонентов
   * он едет не туда, куда скин (у поля — на обёртку с label и error).
   * Куда что класть, знает компонент: cx(s.className, className).
   */
  className: string;
  style: CSSProperties | undefined;
  ref: Ref<HTMLElement> | undefined;
  w: SkinW;
  h: SkinH;
  grow: SkinGrow;
}

export function useSkin<A extends AxisDict, S extends ScaleDict>(
  def: SkinDef<A, S>,
  args: UseSkinArgs<A, S>,
): UseSkinResult<A, S> {
  const { styles, preset: presetName, props, w, h, grow, style, ref } = args;

  const preset = presetName ? def.presets[presetName] : undefined;
  const resolved = resolveSkin(def, styles, presetName, props);
  const presetW = preset?.w as string | number | undefined;
  const presetH = preset?.h as string | number | undefined;

  return {
    axes: resolved.axes,
    className: resolved.className,
    style,
    // Передаём ref напрямую: React 19 сам вызывает cleanup callback-ref.
    ref,
    // Скаляр пресета → responsive-массив дома; проп инстанса уже в этой форме.
    w: w ?? (presetW !== undefined ? [presetW] : undefined),
    h: h ?? (presetH !== undefined ? [presetH] : undefined),
    grow: grow ?? (preset?.grow ? [1] : undefined),
  };
}
