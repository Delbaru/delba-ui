'use client';

import type { WithRef } from '../../core';
import type { ImgProps } from './Img.types';
import { useImg } from './Img.model';
import { ImgContent } from './ImgContent/ImgContent';
import { ImgBlur } from './ImgBlur/ImgBlur';
import { useImgSwap } from './swap/useImgSwap';

export type { ImgProps, ImgSource, ImgSrcTuple } from './Img.types';

export function Img(props: WithRef<ImgProps, HTMLSpanElement>) {
  const image = useImg(props);
  const { Root, resource, lightbox } = image;

  const loaded: ImgProps['onLoad'] = event => {
    image.ready();
    change.loaded(resource.identity);
    props.onLoad?.(event);
  };
  const failed: ImgProps['onError'] = event => {
    change.loaded(resource.identity);
    props.onError?.(event);
  };
  const change = useImgSwap(image.change, resource.identity, (
    <ImgContent
        resource={resource}
        className={image.imageClassName}
        onLoad={loaded}
        onError={failed}
    />
  ));
  const blur = image.blur && <ImgBlur
      resource={resource}
      ready={image.loaded}
      className={image.imageClassName}
  />;

  if (lightbox?.href) {
    return (
      <Root {...image.root}>
        <a
            href={lightbox.href}
            data-fancybox={lightbox.group}
            data-caption={resource.image.alt || undefined}
            className="ui-img-link"
            draggable={false}
            aria-label={lightbox.label}
        >
          {blur}
          {change.node}
        </a>
      </Root>
    );
  }
  return <Root {...image.root}>{blur}{change.node}</Root>;
}
