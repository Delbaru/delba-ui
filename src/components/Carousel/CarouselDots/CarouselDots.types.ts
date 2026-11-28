import type { ReactNode } from 'react';
import type { FlexProps } from '../../Flex';

export interface CarouselDotItem {
  /** Zero-based page index from the carousel, including grouped slides. */
  index: number;
  /** Current page; also updates after dragging or arrow navigation. */
  isActive: boolean;
  /** Navigate through the carousel's own API. */
  onSelect: () => void;
}

export interface CarouselDotsProps extends Omit<FlexProps, 'children'> {
  /** Connect to a carousel outside the nearest enclosing element. */
  carouselId?: string;
  /** Replace a dot with a thumbnail or label. The renderer owns the accessible button and its styling. */
  renderItem?: (item: CarouselDotItem) => ReactNode;
}
