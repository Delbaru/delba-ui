import type { ScrollbarOptions } from '../src/components/ScrollArea/scrollbar';
import type { ObserverMargin } from '../src/core/base/observer-margin';
import type { UiMessageOverrides } from '../src/core/base/message-defaults';
import type {
    CarouselBehaviorDefaults,
    MotionDefaultOverrides,
    MotionDefaults,
} from '../src/core/base/motion-defaults';
import type {
    MotionEasingOverrides,
    MotionEasingName,
    MotionEasingPreset,
} from '../src/core/base/easing';

export type MotionTiming = Readonly<Record<string, number>>;
export type MotionDistances = Readonly<Record<string, number | `${number}%`>>;

export interface UiImages {
    /** Public local API directories that next/image may fetch without visitor cookies. Include the trailing slash; default: none. */
    readonly optimizeApi?: readonly string[];
}

export interface UiMotion {
    /** Named motion durations in seconds. At least one camelCase name is required. */
    readonly timing: MotionTiming;
    /** Named reveal distances: numbers are rpx, percentages are relative to the element. */
    readonly distance?: MotionDistances;
    /** Preparation area for idle, parallax and perspective observers; px/% IntersectionObserver syntax. */
    readonly visibility?: { readonly rootMargin: ObserverMargin };
    /** Per-behavior defaults shared by CSS, JS and SSR. Durations are seconds or timing names. */
    readonly defaults?: MotionDefaultOverrides;
    /** Shared NativeCarousel behavior; instance props override it. Numeric tuning lives in defaults.carousel. */
    readonly carousel?: Partial<CarouselBehaviorDefaults>;
    /** Discoverable motionEasing presets share their curve between CSS and JS. */
    readonly easing?: MotionEasingOverrides;
    /** Default viewport-start behavior. Percentages retain IntersectionObserver's width-relative semantics. */
    readonly inView?: { readonly rootMargin: ObserverMargin; readonly threshold: number };
    /** Default native scroll behavior; seconds, 60 Hz response coefficient, CSS offset and shared easing. */
    readonly scroll?: {
        readonly duration?: number;
        readonly minDuration?: number;
        readonly maxDuration?: number;
        readonly durationPerScreen?: number;
        readonly lerp?: number;
        readonly offset?: string | number;
        readonly easing?: MotionEasingName | MotionEasingPreset;
    };
}

/** Словари осей шкур и папка компонентов проекта (см. `skin/`). */
export interface UiSkins {
    /**
     * Папка компонентов: в её подпапках ищутся `*.skin.ts`, рядом пишется `_states.scss`.
     * Не задана — генерируются только словари (`_tokens.scss`, `_classes.scss`): проект,
     * который печатает состояния сам, берёт у кита карты и движок, но не кодоген.
     */
    readonly dir?: string;
    readonly fills: Readonly<Record<string, string>>;
    /** Линия — [толщина в rpx, цвет]. */
    readonly lines: Readonly<Record<string, readonly [number, string]>>;
    readonly texts: Readonly<Record<string, string>>;
    /**
     * Свои словари проекта рядом с осями кита: имя карты → значения. Попадают в `_tokens.scss`
     * как `$<имя>` и доступны через `@use '@delba/frontend/skin-states'` — ими проект красит СВОИ
     * глаголы (глиф, тень), которых в движке кита нет и быть не должно.
     */
    readonly maps?: Readonly<Record<string, Readonly<Record<string, string>>>>;
    /** Модуль движка состояний в шапке `_states.scss`. По умолчанию `@delba/frontend/skin-states`. */
    readonly states?: string;
    /** Ключи пресета, которые генератор печатает как эффекты покоя. По умолчанию глаголы кита. */
    readonly effects?: readonly string[];
}

/** Strict author tuple: desktop, mobile, tablet. Null preserves the base style. */
export type FrontendTuple<T> = readonly [T | null, T | null, T | null];

export interface FrontendResponsive {
    readonly mobile: { readonly minWidth: 0; readonly designWidth: number; readonly scale: 'fixed' | 'fluid' };
    readonly tablet: { readonly minWidth: number; readonly designWidth: number; readonly scale: 'fixed' | 'fluid' };
    readonly desktop: { readonly minWidth: number; readonly designWidth: number; readonly scale: 'fixed' | 'fluid'; readonly scaleLimit: number };
}

export interface FrontendFont {
    readonly family: string;
    readonly fallback: string;
    readonly faces: readonly {
        readonly src: string;
        readonly weight: number | string;
        readonly style: 'normal' | 'italic';
        readonly display: 'swap' | 'block' | 'fallback' | 'optional';
    }[];
}

export interface FrontendInteractionColor {
    readonly normal: string;
    readonly hover: string;
    readonly pressed: string;
    readonly foreground: string;
}

export interface FrontendColors {
    readonly primary: FrontendInteractionColor;
    readonly secondary: FrontendInteractionColor;
    readonly surface: string;
    readonly text: string;
    readonly line: string;
    readonly error: string;
    readonly warning: string;
    readonly success: string;
    readonly info: string;
    readonly [role: string]: string | FrontendInteractionColor;
}

export interface FrontendTypography {
    /** Key of fonts, not a repeated font stack. */
    readonly fontFamily: FrontendTuple<string>;
    readonly fontSize: FrontendTuple<number>;
    readonly fontWeight: FrontendTuple<number>;
    readonly lineHeight: FrontendTuple<number | string>;
    readonly letterSpacing: FrontendTuple<number>;
    readonly textTransform: FrontendTuple<'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'full-width'>;
}

export type FrontendPadding = number | readonly [number, number] | readonly [number, number, number, number];
export type FrontendLine = readonly [number, string] | readonly [number, string, string];
export interface FrontendGeometry {
    readonly spaces?: Readonly<Record<string, number>>;
    readonly dimensions: Readonly<Record<string, number>>;
    readonly positions: Readonly<Record<string, number>>;
    readonly radii: Readonly<Record<string, number>>;
    readonly padding: Readonly<Record<string, FrontendPadding>>;
    readonly lines: Readonly<Record<string, FrontendLine>>;
    readonly shadows: Readonly<Record<string, string>>;
}

/** Every shared behavior is an explicit author choice in the complete module contract. */
export interface FrontendMotion extends UiMotion {
    readonly distance: MotionDistances;
    readonly defaults: MotionDefaults<string | number>;
    readonly carousel: CarouselBehaviorDefaults;
    readonly easing: Required<MotionEasingOverrides>;
    readonly visibility: { readonly rootMargin: ObserverMargin };
    readonly inView: { readonly rootMargin: ObserverMargin; readonly threshold: number };
    readonly scroll: {
        readonly duration?: number;
        readonly minDuration: number;
        readonly maxDuration: number;
        readonly durationPerScreen: number;
        readonly lerp: number;
        readonly offset: string | number;
        readonly easing: MotionEasingName | MotionEasingPreset;
    };
}

/** One complete visual contract per application. Paths belong to its explicit host root. */
export interface FrontendConfig {
    readonly responsive: FrontendResponsive;
    readonly fonts: Readonly<Record<string, FrontendFont>> & { readonly primary: FrontendFont };
    readonly colors: FrontendColors;
    readonly gradients: Readonly<Record<string, string>>;
    readonly typography: Readonly<Record<string, FrontendTypography>> & {
        readonly body: FrontendTypography;
        readonly caption: FrontendTypography;
        readonly micro: FrontendTypography;
        readonly title: FrontendTypography;
    };
    readonly geometry: FrontendGeometry;
    readonly motion: FrontendMotion;
    /** Numeric variable lengths are RPX; unitless coefficients, weights and layers are strings. */
    readonly variables: Readonly<Record<string, string | number | FrontendTuple<string | number>>>;
    readonly scrollbar: Required<Readonly<ScrollbarOptions>>;
    readonly images?: UiImages;
    readonly messages?: UiMessageOverrides;
}

export { defaultMotion } from './visual/default-motion';
