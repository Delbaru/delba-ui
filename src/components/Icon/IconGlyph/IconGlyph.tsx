'use client';

import type { Ref, SVGProps } from 'react';
import { cx } from '../../../core';
import type { ResolvedIconSource } from '../svg';
import type { FetchedSvgState } from '../useFetchedSvg';
import styles from './IconGlyph.module.scss';

interface IconGlyphProps {
  ref?: Ref<SVGSVGElement>;
  source: ResolvedIconSource;
  fetched: FetchedSvgState;
  html: { __html: string };
  fill?: string;
  hiddenUntilReady?: boolean;
  svgProps: SVGProps<SVGSVGElement> & Record<string, unknown>;
}

/** Source selection and fetched markup have one renderer in all Icon modes. */
export function IconGlyph({ ref, source, fetched, html, fill, hiddenUntilReady, svgProps }: IconGlyphProps) {
  const { className, ...props } = svgProps;
  const classes = cx(styles.IconGlyph, className);

  if (source.kind === 'component') {
    const Component = source.component;
    return <Component ref={ref} className={classes} {...props} />;
  }

  if (source.kind === 'empty' || (hiddenUntilReady && !fetched.content)) return null;

  return (
    <svg
        ref={ref}
        data-icon-loading={fetched.content ? undefined : 'true'}
        className={classes}
        fill={fill == null ? fetched.rootFill : undefined}
        viewBox={fetched.viewBox || props.viewBox}
        dangerouslySetInnerHTML={html}
        {...props}
    />
  );
}
