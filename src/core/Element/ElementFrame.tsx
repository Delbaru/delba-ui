'use client';

import type { ReactNode } from 'react';
import { CollapseWrap, type CollapseWrapProps } from '../../components/Collapse/CollapseWrap';
import { InteractionScope, type InteractionScopeProps } from '../InteractionScope';

export interface ElementFrameProps {
    collapse?: Omit<CollapseWrapProps, 'children'>;
    popup?: ReactNode;
    interaction?: Omit<InteractionScopeProps, 'children'>;
    children: ReactNode | ((active: boolean) => ReactNode);
}

export function ElementFrame({ collapse, popup, interaction, children }: ElementFrameProps) {
    const host = interaction
        ? <InteractionScope {...interaction}>{children}</InteractionScope>
        : typeof children === 'function' ? children(false) : children;
    const content = <>{host}{popup}</>;
    return collapse ? <CollapseWrap {...collapse}>{content}</CollapseWrap> : content;
}
