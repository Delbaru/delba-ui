import { getImageProps, type ImageProps } from 'next/image';
import { resolveResponsive, type BoxLayoutProps } from '../../core';
import { SCALE } from '../../core/scale';
import { imageUnoptimized, nativeImageSizes } from './optimization';
import { imageSourceSizes } from './source-sizing';
import type { ImgProps, ImgSource } from './Img.types';

export function imageAddress(source: ImgSource): string {
  if (typeof source === 'string') return source;
  return 'default' in source ? source.default.src : source.src;
}

export function prepareImage(props: ImgProps, box: BoxLayoutProps, native: Omit<ImageProps, 'src' | 'alt'>) {
  const { src, sizes, sizesWidth, sizesHeight, objectFit, quality, priority, loading, fetchPriority } = props;
  if (quality !== undefined && (quality < 1 || quality > 100)) {
    throw new Error(`[Img] quality must be between 1 and 100. Got: ${quality}`);
  }
  const [desktop, mobile, tablet] = Array.isArray(src) ? src : [src, null, null];
  const automatic = !sizes && sizesWidth === undefined && sizesHeight === undefined && !priority
    && native.preload !== true && loading !== 'eager'
    && resolveResponsive(objectFit).every(value => value === 'contain');
  const shared = {
    ...native,
    loading: priority ? 'eager' : (loading ?? (automatic ? 'lazy' : undefined)),
    fetchPriority: priority ? 'high' : fetchPriority,
    alt: typeof props.alt === 'string' ? props.alt : '',
    fill: true,
    quality: quality === undefined ? undefined : Math.max(1, Math.min(100, quality)),
  } satisfies Omit<ImageProps, 'src'>;

  function prepare(source: ImgSource, main = false) {
    const fallback = sizes || imageSourceSizes({
      width: sizesWidth ?? props.rootW ?? box.w,
      height: sizesHeight ?? props.rootH ?? box.h,
      aspectRatio: props.aspectRatio, objectFit: objectFit ?? 'cover', source, scale: SCALE,
    });
    return {
      ...shared, src: source,
      sizes: main && automatic && !sizes ? nativeImageSizes(fallback) : fallback,
      unoptimized: imageUnoptimized(imageAddress(source), native.unoptimized),
    };
  }

  const image = prepare(desktop, true);
  const sources = [
    { source: mobile, media: 'mobile' as const },
    { source: tablet, media: 'tablet' as const },
  ].flatMap(({ source, media }) => {
    if (source === null) return [];
    // A desktop-valued mobile source must still override a distinct tablet source below 768px.
    const mobileOverridesTablet = media === 'mobile' && tablet !== null && tablet !== desktop;
    if (source === desktop && !mobileOverridesTablet) return [];
    const prepared = prepare(source);
    const result = getImageProps(prepared).props;
    const srcSet = result.srcSet ?? result.src.replace(/[\t\n\f\r ]/g, encodeURIComponent);
    return [{ media, srcSet, sizes: prepared.sizes }];
  });
  return {
    identity: imageAddress(desktop), image, sources,
    picture: sources.length ? getImageProps(image).props : null,
  };
}

export type ImageResource = ReturnType<typeof prepareImage>;
