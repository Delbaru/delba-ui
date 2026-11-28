import Image from 'next/image';
import { cx } from '#core';
import type { ImageResource } from '../Img.resource';
import styles from './ImgBlur.module.scss';

export function ImgBlur({ resource, ready, className }: { resource: ImageResource; ready: boolean; className: string }) {
  return <Image
      {...resource.image}
      alt=""
      aria-hidden
      draggable={false}
      sizes="5vw"
      data-img-blur=""
      data-ready={ready || undefined}
      className={cx(styles.ImgBlur, className)}
  />;
}
