import type { CSSProperties, ImgHTMLAttributes } from 'react';

type ImageInput = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  quality?: number;
  loader?: (input: unknown) => string;
  unoptimized?: boolean;
};

export function getImageProps(input: ImageInput) {
  const { fill, quality: _quality, loader: _loader, unoptimized: _unoptimized, style, ...props } = input;
  return { props: { ...props, style: fill ? { ...fillStyle, ...style } : style } };
}

const fillStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

export default function NextImage({ fill, quality: _quality, loader: _loader, unoptimized: _unoptimized, style, ...props }: ImageInput) {
  return <img {...props} style={fill ? { ...fillStyle, ...style } : style} />;
}
