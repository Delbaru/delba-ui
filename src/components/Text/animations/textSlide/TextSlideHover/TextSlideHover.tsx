'use client';
'use no memo';

import { type CSSProperties } from 'react';

import { cx } from '../../../../../core';
import { motionTimeCss } from '../../../../../core/base/timing';
import type { TextAnimationContext } from '../../types';
import type { TextSlideOptions } from '../types';

import styles from './TextSlideHover.module.scss';

export function TextSlideHover({ content, options }: TextAnimationContext<TextSlideOptions>) {
  const hoverStyle = {
    '--text-slide-duration':
      options?.duration !== undefined
        ? motionTimeCss(options.duration)
        : 'var(--t-m-text-slide-hover-duration)',
    '--text-slide-hover-color': options?.hoverColor ?? 'var(--primary)',
  } as CSSProperties;

  return (
    <span className={cx(styles.TextSlideHover, 'ui-slide-hover')} style={hoverStyle}>
      <span className={'ui-slide-hover-viewport'}>
        <span className={cx('ui-slide-hover-layer', 'ui-slide-hover-base')}>{content}</span>

        <span aria-hidden="true" className={cx('ui-slide-hover-layer', 'ui-slide-hover-alt')}>
          {content}
        </span>
      </span>
    </span>
  );
}
