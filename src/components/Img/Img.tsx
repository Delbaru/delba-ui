"use client";

import Link from 'next/link';
import Image, { getImageProps, type ImageProps } from 'next/image';
import { useMemo, useState, type CSSProperties } from 'react';
import type React from 'react';

import { MEDIA_QUERY, boxLayout, createLayoutClasses, cx, resolveLinkProps, resolveResponsive, shouldUseNextLink, sizeClasses, splitBoxLayout, splitRootDomProps, stateLinkProps, useMergedRefs, type BoxLayoutProps, type ResponsiveValue, type SizeValue, type StateLinkInput, type WithRef } from '../../core';
import { imageSizes } from '../../core/base/scale';
import { SCALE } from '../../core/scale';
import { useFancybox } from '../../hooks/useFancybox';
import { isAppearanceAnimate, withoutStagger, type RevealInput, type RevealOptions } from '../../core/reveal/reveal';
import { isSharedMotionAnimate, useSharedMotion, type SharedMotionProps } from '../../hooks/useSharedMotion';
import { useImgSwap } from './swap/useImgSwap';
import type { ImgAnimate } from './swap/types';
import { imageUnoptimized, nativeImageSizes } from './optimization';

const c = createLayoutClasses();

type ObjectFitKey = 'contain' | 'cover' | 'fill' | 'none' | 'scale_down';

type ObjectPositionKey =
  | 'center'
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top_left' | 'top_center' | 'top_right'
  | 'center_left' | 'center_right'
  | 'bottom_left' | 'bottom_center' | 'bottom_right';

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

type ImgElementProps = ImgBaseProps & Record<string, unknown>;

export interface ImgProps extends ImgBaseProps, BoxLayoutProps, ImgRootSizeProps, SharedMotionProps<ImgAnimate> {
  /** Explicitly override ui.config.images.optimizeApi and the private /api/ default. Only enable optimization for sources accessible without visitor cookies. */
  unoptimized?: boolean;
  className?: string;
  style?: CSSProperties;
  'data-point-events'?: string;

  alt: string;

  /**
   * Картинка. Строка или импорт — как у `next/image`. Кортеж `[desktop, mobile, tablet]` —
   * свой кадр на полосу ширины (`ImgSrcTuple`): внутри рисуется `<picture>`, и браузер сам
   * меняет кадр при смене ширины окна. Размеры, `sizes`, `objectFit` — общие на все кадры.
   */
  src: ImgSource | ImgSrcTuple;

  /**
   * Анимация смены картинки при смене `src`: `{ when: 'change', effect: 'veil', direction }`.
   * Прежняя картинка держится слоем, пока новая не загрузится и не доедет; первый показ — без хода,
   * «меньше движения» — мгновенно. Legacy ключи и tuple остаются поддержаны. См. `ImgAnimate`.
   */
  animate?: SharedMotionProps<ImgAnimate>['animate'];

  /**
   * Появление при прокрутке: `{ effect: 'blur', delay: 0.1 }` — как у Flex, но без каскада:
   * появляется сама картинка. Ключи и tuple `[key, options]` сохранены для совместимости.
   * Без JS и при «меньше движения» видна сразу.
   */
  reveal?: RevealInput<Omit<RevealOptions, 'stagger'>>;

  objectFit?: ResponsiveValue<ObjectFitKey>;
  objectPosition?: ResponsiveValue<ObjectPositionKey>;

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

  /** Размеры контейнера (wrapper). Полезно, если картинка должна рендериться на 100%, а intrinsic размеры другие. */
  blur?: boolean;

  quality?: number;

  onLoad?: React.ComponentPropsWithoutRef<'img'>['onLoad'];
  onError?: React.ComponentPropsWithoutRef<'img'>['onError'];

  linkState?: StateLinkInput;
  fancybox?: string;

  /**
   * Картинка САМА становится ссылкой: корень рисуется `<a>` (или `next/link`), обёртка не нужна —
   * логотип в шапке, карточка-картинка. С `fancybox` не сочетается: там ссылку рисует лайтбокс, и
   * ссылка в ссылке — сломанная разметка; заданный `href` в этом случае выигрывает, лайтбокс молчит.
   */
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
  newTab?: boolean;
  nofollow?: boolean;
  noreferrer?: boolean;
}

const parseAspect = (value?: string | null): number | null => {
  if (!value) return null;

  const parts = value.split(/[/:]/);
  if (parts.length !== 2) throw new Error(`[Img] aspectRatio must be "w/h". Got: ${value}`);

  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) {
    throw new Error(`[Img] aspectRatio parts must be finite numbers. Got: ${value}`);
  }

  return w / h;
};

const required = (value: SizeValue | null | undefined, ctx: string): SizeValue => {
  if (value === null || value === undefined) throw new Error(`[Img] width is required for ${ctx}`);
  return value;
};

const deriveWidthFromHeight = (
  height: SizeValue | null | undefined,
  aspect: number | null,
  ctx: string
): SizeValue => {
  if (height === null || height === undefined) {
    throw new Error(`[Img] cannot derive width for ${ctx}: height is missing`);
  }
  if (!Number.isFinite(aspect ?? NaN)) {
    throw new Error(`[Img] cannot derive width for ${ctx}: aspectRatio is missing or invalid`);
  }

  if (typeof height === 'number') {
    return height * (aspect as number);
  }

  const trimmed = height.toString().trim();
  if (trimmed.endsWith('%')) {
    // deriving px from % height is ambiguous → forbid
    throw new Error(`[Img] cannot derive width from percent height for ${ctx}. Use explicit width.`);
  }

  throw new Error(`[Img] unsupported height unit for deriving width (${ctx}): ${height}`);
};

const buildSizes = (
  width: ResponsiveValue<SizeValue> | undefined,
  height: ResponsiveValue<SizeValue> | undefined,
  aspectRatio: ResponsiveValue<string> | undefined
): string => {
  const [wd, wm, wt] = resolveResponsive(width ?? null);
  const [hd, hm, ht] = resolveResponsive(height ?? null);
  const [ad, am, at] = resolveResponsive(aspectRatio ?? null);

  const widthDesktop = wd ?? deriveWidthFromHeight(hd, parseAspect(ad ?? undefined), 'desktop');
  const widthMobile = wm ?? deriveWidthFromHeight(hm, parseAspect(am ?? ad ?? undefined), 'mobile');
  const widthTablet = wt ?? deriveWidthFromHeight(ht, parseAspect(at ?? ad ?? undefined), 'tablet');

  // Число — rpx, а не px: `sizes` пересчитывается в долю окна по базам масштаба проекта.
  return imageSizes({ desktop: required(widthDesktop, 'desktop'), mobile: required(widthMobile, 'mobile'), tablet: required(widthTablet, 'tablet') }, SCALE);
};

/**
 * Источники по полосам. Своя `<source>` нужна полосе, только если кадр у неё СВОЙ: совпал с
 * десктопным — браузеру нечего переключать.
 */
function resolveSources(src: ImgSource | ImgSrcTuple): { desktop: ImgSource; mobile: ImgSource | null; tablet: ImgSource | null } {
  if (!Array.isArray(src)) return { desktop: src, mobile: null, tablet: null };
  const [desktop, mobile, tablet] = src;
  return {
    desktop,
    mobile: mobile !== null && mobile !== desktop ? mobile : null,
    tablet: tablet !== null && tablet !== desktop ? tablet : null,
  };
}

function resolveFancyboxHref(src: ImageProps['src']): string | null {
  if (typeof src === 'string') {
    return src;
  }

  if (src && typeof src === 'object' && 'src' in src && typeof src.src === 'string') {
    return src.src;
  }

  return null;
}

export function Img({
  ref,
  id,
  className = '',
  style,
  'data-point-events': dataPointEvents,
  alt,
  src,
  animate,
  w,
  minW,
  maxW,
  h,
  minH,
  maxH,
  rootW,
  rootH,
  grow,
  r,
  tlr,
  trr,
  brr,
  blr,
  borderTLR,
  borderTRR,
  borderBRR,
  borderBLR,
  objectFit,
  objectPosition,
  aspectRatio,
  bg,
  sizes,
  sizesWidth,
  sizesHeight,
  blur = false,
  quality,
  priority,
  loading,
  fetchPriority,
  onLoad,
  onError,
  linkState,
  perspective3d,
  parallax,
  reveal,
  fancybox,
  href,
  target,
  rel,
  download,
  newTab,
  nofollow,
  noreferrer,
  ...rest
}: WithRef<ImgProps, HTMLSpanElement>) {
  const { box, rest: props } = splitBoxLayout(rest);
  // Размеры обёртки — не из коробки: `rootW`/`rootH` перекрывают размеры картинки.
  const layout = boxLayout(c, { ...box, r, tlr, trr, brr, blr, borderTLR, borderTRR, borderBRR, borderBLR, bg, aspectRatio, grow });
  const [isLoaded, setIsLoaded] = useState(false);
  // Каскад у картинки означал бы её внутренние слои — снимаем.
  const appearanceAnimate = isAppearanceAnimate(animate) ? { ...animate, stagger: 0 } : isSharedMotionAnimate(animate) ? animate : undefined;
  const contentAnimate = isSharedMotionAnimate(animate) ? undefined : animate;
  const { motionHandlers, motionStyle, revealAttrs, setMotionNode } = useSharedMotion({ perspective3d, parallax, reveal: withoutStagger(reveal), animate: appearanceAnimate });
  const imageSizeProps = {
    w,
    minW,
    maxW,
    h,
    minH,
    maxH,
  };
  const wrapperSizeProps = {
    w: rootW ?? imageSizeProps.w,
    minW: imageSizeProps.minW,
    maxW: imageSizeProps.maxW,
    h: rootH ?? imageSizeProps.h,
    minH: imageSizeProps.minH,
    maxH: imageSizeProps.maxH,
  };
  const { rootProps, elementProps } = splitRootDomProps(props as ImgElementProps);
  const automaticSizes = !sizes && sizesWidth === undefined && sizesHeight === undefined &&
    !priority && elementProps.preload !== true && loading !== 'eager' &&
    resolveResponsive(objectFit).every(value => value === 'contain');

  // Next fetches originals without visitor cookies. Local API files are private by default;
  // the project may declare public directories once in ui.config.images.optimizeApi.
  const sources = resolveSources(src);
  // `priority` — «картинка первого экрана»: в Next 16 это eager + high, без устаревшего `priority` и без
  // preload-ссылки, которая у кадров по полосам тянула бы десктопный файл и на телефон.
  const imageProps = {
    ...elementProps,
    loading: priority ? 'eager' : loading ?? (automaticSizes ? 'lazy' : undefined),
    fetchPriority: priority ? 'high' : fetchPriority,
    src: sources.desktop,
    unoptimized: imageUnoptimized(sources.desktop, elementProps.unoptimized),
  } as const;
  const hasArtDirection = sources.mobile !== null || sources.tablet !== null;

  // Ссылка на самой картинке отменяет лайтбокс: два `<a>` друг в друге — сломанная разметка.
  const isLink = Boolean(href);
  const Root = (isLink ? (shouldUseNextLink(href, target, download) ? Link : 'a') : 'span') as React.ElementType;
  const linkProps = isLink ? resolveLinkProps({ href, target, rel, download, newTab, nofollow, noreferrer }) : null;
  const fancyboxGroup = isLink ? undefined : fancybox?.trim();
  const fancyboxHref = useMemo(() => resolveFancyboxHref(sources.desktop), [sources.desktop]);
  const hasFancybox = Boolean(fancyboxGroup && fancyboxHref);

  useFancybox(hasFancybox);

  // useCallback обязателен: ref-колбэк со скачущей идентичностью React отцепляет и цепляет
  // заново каждый рендер, а это сбрасывает накопленный моушен в setMotionNode(null).
  const setRefs = useMergedRefs(setMotionNode, ref);

  const computedSizes = useMemo(() => {
    if (sizes) return sizes;
    const widthForSizes = sizesWidth ?? imageSizeProps.w;
    const heightForSizes = sizesHeight ?? imageSizeProps.h;
    const fallback = buildSizes(widthForSizes, heightForSizes, aspectRatio);
    // Lazy contain знает свою реальную рамку после layout. В поддерживающем браузере
    // выбор ресурса нативный; старый браузер использует прежний responsive fallback.
    // Cover и явные подсказки сохраняем: им может требоваться запас под crop/zoom.
    return automaticSizes ? nativeImageSizes(fallback) : fallback;
  }, [aspectRatio, automaticSizes, imageSizeProps.h, imageSizeProps.w, sizes, sizesHeight, sizesWidth]);
  const normalizedAlt = typeof alt === 'string' ? alt : '';
  const swapIdentity = typeof sources.desktop === 'string' ? sources.desktop : resolveFancyboxHref(sources.desktop) ?? '';
  const fancyboxAriaLabel = normalizedAlt || 'Изображение';

  if (quality !== undefined && (quality < 1 || quality > 100)) {
    throw new Error(`[Img] quality must be between 1 and 100. Got: ${quality}`);
  }
  const normalizedQuality = quality === undefined ? undefined : Math.max(1, Math.min(100, quality));

  const handleLoad: React.ComponentPropsWithoutRef<'img'>['onLoad'] = (event) => {
    setIsLoaded(true);
    swapLoaded(swapIdentity);
    onLoad?.(event);
  };

  // Не загрузилась — смену всё равно доводим, иначе прежняя картинка висела бы вечно.
  const handleError: React.ComponentPropsWithoutRef<'img'>['onError'] = (event) => {
    swapLoaded(swapIdentity);
    onError?.(event);
  };

  const imageClassName = cx(
    'ui-img-image',
    ...c.value('objectFit', objectFit ?? 'cover'),
    ...c.value('objectPosition', objectPosition ?? 'center'),
  );

  /**
   * Кадр по полосам — `<picture>` через `getImageProps()`, как советует Next для art
   * direction: у каждого источника свой `srcSet` от оптимизатора, а `<img>` внутри — это
   * десктопный кадр со всеми атрибутами `next/image` (fill, sizes, loading). Порядок
   * `<source>` — от узкой полосы к широкой: браузер берёт ПЕРВУЮ подошедшую.
   */
  const pictureProps = (source: ImgSource) =>
    getImageProps({
      ...imageProps,
      src: source,
      unoptimized: imageUnoptimized(source, elementProps.unoptimized),
      alt: normalizedAlt,
      fill: true,
      sizes: computedSizes,
      quality: normalizedQuality,
    }).props;

  const pictureSource = (source: ImgSource) => {
    const props = pictureProps(source);
    return props.srcSet ?? props.src;
  };

  const mainImage = hasArtDirection ? (
    <picture>
      {sources.mobile !== null && (
        <source
            media={MEDIA_QUERY.mobile}
            srcSet={pictureSource(sources.mobile)}
            sizes={computedSizes}
        />
      )}
      {sources.tablet !== null && (
        <source
            media={MEDIA_QUERY.below}
            srcSet={pictureSource(sources.tablet)}
            sizes={computedSizes}
        />
      )}
      <img
          {...pictureProps(sources.desktop)}
          alt={normalizedAlt}
          draggable={false}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
      />
    </picture>
  ) : (
    <Image
        {...imageProps}
        alt={normalizedAlt}
        draggable={false}
        fill
        sizes={computedSizes}
        quality={normalizedQuality}
        className={imageClassName}
        onLoad={handleLoad}
        onError={handleError}
    />
  );

  const { node: swapped, loaded: swapLoaded } = useImgSwap(contentAnimate, swapIdentity, mainImage);

  return (
    <Root
      ref={setRefs}
      id={id}
      data-point-events={dataPointEvents}
      {...(rootProps as React.HTMLAttributes<HTMLSpanElement>)}
      {...linkProps}
      {...stateLinkProps(linkState, motionHandlers)}
      {...revealAttrs}
      className={cx('ui-img', ...sizeClasses(c, wrapperSizeProps), ...layout, className)}
      style={{
        ...(motionStyle ?? null),
        ...style,
      }}
    >
      {hasFancybox ? (
        <a
            href={fancyboxHref ?? undefined}
            data-fancybox={fancyboxGroup}
            data-caption={normalizedAlt || undefined}
            className={'ui-img-link'}
            draggable={false}
            aria-label={fancyboxAriaLabel}
        >
          {blur && (
            <Image
              {...imageProps}
              alt=""
              aria-hidden
              draggable={false}
              fill
              sizes="5vw"
              quality={normalizedQuality}
              className={cx(
                'ui-img-image',
                'ui-img-blur',
                isLoaded && 'ui-img-blur-hidden',
                ...c.value('objectFit', objectFit ?? 'cover'),
                ...c.value('objectPosition', objectPosition ?? 'center'),
              )}
            />
          )}
          {swapped}
        </a>
      ) : (
        <>
          {blur && (
            <Image
              {...imageProps}
              alt=""
              aria-hidden
              draggable={false}
              fill
              sizes="5vw"
              quality={normalizedQuality}
              className={cx(
                'ui-img-image',
                'ui-img-blur',
                isLoaded && 'ui-img-blur-hidden',
                ...c.value('objectFit', objectFit ?? 'cover'),
                ...c.value('objectPosition', objectPosition ?? 'center'),
              )}
            />
          )}
          {swapped}
        </>
      )}
    </Root>
  );
}
