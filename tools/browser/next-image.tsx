import type { CSSProperties, ImgHTMLAttributes } from 'react';

type ImageSource = string | { src: string } | { default: { src: string } };

type ImageInput = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: ImageSource;
  fill?: boolean;
  quality?: number;
  loader?: (input: unknown) => string;
  unoptimized?: boolean;
};

function sourceUrl(source: ImageSource | undefined): string | undefined {
  if (typeof source === 'string') return source;
  if (!source) return undefined;
  return 'src' in source ? source.src : source.default.src;
}

export function getImageProps(input: ImageInput) {
  const {
    fill,
    quality: _quality,
    loader: _loader,
    unoptimized: _unoptimized,
    style,
    src,
    ...props
  } = input;
  return {
    props: { ...props, src: sourceUrl(src), style: fill ? { ...fillStyle, ...style } : style },
  };
}

const fillStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

export default function NextImage({
  fill,
  quality: _quality,
  loader: _loader,
  unoptimized: _unoptimized,
  style,
  src,
  ...props
}: ImageInput) {
  return <img {...props} src={sourceUrl(src)} style={fill ? { ...fillStyle, ...style } : style} />;
}
