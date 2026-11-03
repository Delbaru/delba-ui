'use client';

import { useMemo } from 'react';

import {
  hasIconSource,
  resolveIconSource,
  type IconComponent,
  type IconSourceInput,
  type ResolvedIconSource,
} from './svg';
import { componentSwapKey } from './swap';
import { useFetchedSvg } from './useFetchedSvg';

interface IconSourceOptions {
  src?: string | IconComponent;
  name?: string;
  component?: IconComponent;
  hover?: IconSourceInput;
  normalizePaint: boolean;
}

function useLoadedSource(source: ResolvedIconSource, normalizePaint: boolean) {
  const url = source.kind === 'url' ? source.url : null;
  const fetched = useFetchedSvg(url, normalizePaint);
  const html = useMemo(() => ({ __html: fetched.content ?? '' }), [fetched.content]);

  return { source, fetched, html };
}

/** Resolves source precedence, fetches only URL sources, and owns swap identity/readiness. */
export function useIconSources({ src, name, component, hover, normalizePaint }: IconSourceOptions) {
  const baseSource = resolveIconSource({ src, name, component });
  const hoverSource = resolveIconSource(hover);
  const base = useLoadedSource(baseSource, normalizePaint);
  const hoverIcon = useLoadedSource(hoverSource, normalizePaint);
  let identity: string | number | null = null;
  if (baseSource.kind === 'url') identity = baseSource.url;
  if (baseSource.kind === 'component') identity = componentSwapKey(baseSource.component);

  return {
    base,
    hover: hoverIcon,
    hasHover: hasIconSource(hoverSource),
    identity,
    ready: baseSource.kind === 'component' || base.fetched.content != null,
  };
}
