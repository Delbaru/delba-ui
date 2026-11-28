'use client';

import type { WithRef } from '#core';
import { ElementFrame, ElementScope } from '#core/Element';
import { MotionLayers } from '#core/Motion';
import { useFlex } from './Flex.model';
import type { FlexProps } from './Flex.types';
export type { FlexProps } from './Flex.types';

export function Flex(props: WithRef<FlexProps, HTMLElement>) {
    const flex = useFlex(props);
    const Host = flex.host;

    return (
        <ElementFrame {...flex.frame}>
            {active => (
                <Host {...flex.root(active)}>
                    {flex.html ? undefined : (
                        <>
                            <ElementScope scope={flex.scope}>{flex.children}</ElementScope>
                            <MotionLayers effects={flex.effects} />
                        </>
                    )}
                </Host>
            )}
        </ElementFrame>
    );
}
