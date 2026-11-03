import Image from 'next/image';
import type { ImgProps } from '../Img.types';
import type { ImageResource } from '../Img.resource';
import { cx, MEDIA_QUERY } from '../../../core';
import styles from './ImgContent.module.scss';

interface ImgContentProps {
  resource: ImageResource;
  className: string;
  onLoad: ImgProps['onLoad'];
  onError: ImgProps['onError'];
}

export function ImgContent({ resource, className, onLoad, onError }: ImgContentProps) {
  const media = { mobile: MEDIA_QUERY.mobile, tablet: MEDIA_QUERY.below };
  const events = { onLoad, onError, draggable: false };
  if (!resource.picture) {
    return <Image {...resource.image} {...events} className={cx(styles.ImgContent, className)} />;
  }
  return (
    <picture className={styles.ImgContent}>
      {resource.sources.map(source => (
        <source
            key={source.media}
            media={media[source.media]}
            srcSet={source.srcSet}
            sizes={source.sizes}
        />
      ))}
      <img {...resource.picture} {...events} alt={resource.image.alt} className={className} />
    </picture>
  );
}
