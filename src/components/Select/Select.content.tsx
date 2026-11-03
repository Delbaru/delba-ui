import type { ReactNode } from 'react';
import { Text } from '../Text';

/** Text options inherit typography; custom content keeps its markup. */
export const selectContent = {
  render(node: ReactNode, className?: string): ReactNode {
    if (typeof node !== 'string' && typeof node !== 'number') return node;

    return <Text variant={['body', 'body', 'body']} className={
      className
    } color="inherit">{node}</Text>;
  },
};
