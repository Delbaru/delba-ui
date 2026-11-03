import type { ImageProps } from 'next/image';
import type React from 'react';
import type { CSSProperties } from 'react';
import type { BoxLayoutProps, ResponsiveValue, SizeValue, StateLinkInput } from '../../core';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { ImgAnimate } from './swap/types';

type ObjectFitKey = 'contain' | 'cover' | 'fill' | 'none' | 'scale_down';

type ObjectPositionKey =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'center_left'
  | 'center_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right';

type ImgBaseProps = Omit<
  ImageProps,
  | 'width'
  | 'height'
  | 'fill'
  | 'objectFit'
  | 'objectPosition'
  | 'style'
  | 'className'
  | 'sizes'
  | 'alt'
  | 'onLoad'
  | 'onError'
  | 'src'
>;

/** Один источник картинки — то, что принимает `next/image`: адрес или импорт файла. */
export type ImgSource = ImageProps['src'];

/**
 * Свой кадр на каждую полосу ширины — «art direction»: `[desktop, mobile, tablet]`, порядок
 * тот же, что у всех кортежей кита. `null` — ПРОПУСК полосы, как у пропов раскладки: своей
 * `<source>` у неё нет, и она получает то, что получила бы по каскаду (планшет без своего
 * кадра — десктопный, телефон без своего — планшетный, если он есть).
 *
 * Отдельный тип, а не `ResponsiveValue`: под `strictTuple` проекта тот запрещает скаляр, а
 * `src="…"` строкой обязан работать как раньше — публичное в ките только добавляют.
 */
export type ImgSrcTuple = [ImgSource, ImgSource | null, ImgSource | null];

type ImgRootSizeProps = {
  rootW?: ResponsiveValue<SizeValue>;
  rootH?: ResponsiveValue<SizeValue>;
};

export interface ImgProps
  extends ImgBaseProps,
    BoxLayoutProps,
    ImgRootSizeProps,
    SharedMotionProps<ImgAnimate> {
  /** Explicitly override ui.config.images.optimizeApi and the private /api/ default. Only enable optimization for sources accessible without visitor cookies. */
  unoptimized?: boolean;
  /** Additional root class. */
  className?: string;
  /** Inline root styles. */
  style?: CSSProperties;
  /** Pointer-event scope marker for composed media. */
  'data-point-events'?: string;

  /** Text alternative; use an empty string for decorative images. */
  alt: string;

  /**
   * Картинка. Строка или импорт — как у `next/image`. Кортеж `[desktop, mobile, tablet]` —
   * свой кадр на полосу ширины (`ImgSrcTuple`): внутри рисуется `<picture>`, и браузер сам
   * меняет кадр при смене ширины окна. Размеры и `objectFit` — общие на все кадры. Если источник
   * содержит исходные `width`/`height`, `cover` учитывает их при выборе размера после обрезки.
   */
  src: ImgSource | ImgSrcTuple;

  /**
   * Анимация смены картинки при смене `src`: `{ when: 'change', effect: 'veil', direction }`.
   * Прежняя картинка держится слоем, пока новая не загрузится и не доедет; первый показ — без хода,
   * «меньше движения» — мгновенно. Объектный API — основной договор. См. `ImgAnimate`.
   */
  animate?: SharedMotionProps<ImgAnimate>['animate'];

  /** How the image fits its frame; defaults to cover. */
  objectFit?: ResponsiveValue<ObjectFitKey>;
  /** Image alignment inside its frame; defaults to center. */
  objectPosition?: ResponsiveValue<ObjectPositionKey>;

  /** Frame aspect ratio on each responsive band. */
  aspectRatio?: ResponsiveValue<string>;

  /** Явная подсказка ресурса. Без неё lazy contain использует native auto с responsive fallback. */
  sizes?: string;

  /**
   * Опционально: использовать другое значение для расчёта `sizes`, чем реальный rendered width/height.
   * Полезно, если контейнер должен быть 100%, но хотим подсказать оптимизатору целевую ширину.
   * Число — rpx (как у `w`): в `sizes` оно уходит долей окна по базам `scale` проекта, процент — процентом окна.
   */
  sizesWidth?: ResponsiveValue<SizeValue>;
  sizesHeight?: ResponsiveValue<SizeValue>;

  /** Размеры контейнера (wrapper). Автоматический `sizes` следует за этими фактическими границами. */
  blur?: boolean;

  /** Next image quality from 1 to 100. */
  quality?: number;

  /** Called after the incoming image is loaded. */
  onLoad?: React.ComponentPropsWithoutRef<'img'>['onLoad'];
  /** Called after loading fails; releases a pending image transition. */
  onError?: React.ComponentPropsWithoutRef<'img'>['onError'];

  /** Connect root interaction to the shared link-state scope. */
  linkState?: StateLinkInput;
  /** Optional lightbox group; ignored when href is present. */
  fancybox?: string;

  /**
   * Картинка САМА становится ссылкой: корень рисуется `<a>` (или `next/link`), обёртка не нужна —
   * логотип в шапке, карточка-картинка. С `fancybox` не сочетается: там ссылку рисует лайтбокс, и
   * ссылка в ссылке — сломанная разметка; заданный `href` в этом случае выигрывает, лайтбокс молчит.
   */
  href?: string;
  /** Native link target. */
  target?: string;
  /** Native link relationship tokens. */
  rel?: string;
  /** Native download name or flag. */
  download?: boolean | string;
  /** Open the link in a new browsing context. */
  newTab?: boolean;
  /** Add nofollow to the link relationship. */
  nofollow?: boolean;
  /** Suppress the link referrer. */
  noreferrer?: boolean;
}

