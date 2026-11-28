import type { ReactNode } from 'react';
import { Text, type TextProps } from '../Text';

/** Text options inherit typography; custom content keeps its markup. */
export const selectContent = {
    render(
        node: ReactNode,
        className?: string,
        variant: TextProps['variant'] = ['body', 'body', 'body'],
    ): ReactNode {
        if (typeof node !== 'string' && typeof node !== 'number') return node;

        return <Text variant={variant} className={className} color="inherit">{node}</Text>;
    },
};
