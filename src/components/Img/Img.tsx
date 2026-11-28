'use client';

import type { WithRef } from '#core';
import type { ImgProps } from './Img.types';
import { useImg } from './Img.model';
import { ImgContent } from './ImgContent/ImgContent';
import { ImgBlur } from './ImgBlur/ImgBlur';
import { useImgSwap } from './swap/useImgSwap';
import styles from './Img.module.scss';

export function Img(props: WithRef<ImgProps, HTMLSpanElement>) {
  const image = useImg(props);
  const { host: Root, resource, lightbox } = image;
  const content = useImgSwap(image.change, resource.identity, settled => (
    <ImgContent {...image.content(settled)} />
  ));
  const media = (
    <>
      {image.blur && <ImgBlur resource={resource} ready={image.loaded} className={image.imageClassName} />}
      {content}
    </>
  );

  return (
    <Root {...image.root}>
      {lightbox?.href ? (
        <a
            href={lightbox.href}
            data-fancybox={lightbox.group}
            data-caption={resource.image.alt || undefined}
            className={styles.Link}
            draggable={false}
            aria-label={lightbox.label}
        >
          {media}
        </a>
      ) : media}
    </Root>
  );
}
