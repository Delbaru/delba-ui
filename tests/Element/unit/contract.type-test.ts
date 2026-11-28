import { useElement } from '../../../src/core/Element';
import type { FlexProps } from '../../../src/components/Flex';

export const appearance: FlexProps = {
    animate: {
        appearance: { when: 'inView', effect: 'up' },
        hover: { effect: 'transform', scale: 1.02 },
        idle: { effect: 'glow' },
    },
};
export const change: FlexProps = {
    animate: {
        change: { effect: 'fade', key: 'details', duration: 'fast' },
        hover: { effect: 'rise' },
    },
};
// @ts-expect-error legacy when belongs inside appearance or is replaced by change
export const legacy: FlexProps = { animate: { when: 'load', effect: 'fade' } };
// @ts-expect-error appearance and keyed change own the same animation surface
export const conflicting: FlexProps = { animate: { appearance: { when: 'load', effect: 'fade' }, change: { effect: 'fade', key: 'next' } } };


export function useSvgContract() {
    return useElement<SVGSVGElement>({
        ref: node => { node?.getBBox(); },
        motion: { animate: { appearance: { when: 'inView', effect: 'fade' } } },
        events: [{ handlers: { onMouseEnter: event => { event.currentTarget.getBBox(); } } }],
    });
}
