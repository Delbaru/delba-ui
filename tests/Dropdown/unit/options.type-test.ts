import type { ReactElement, RefObject } from 'react';
import type { DropdownProps, DropdownTriggerProps } from '../../../src/components/Dropdown/Dropdown.types';

declare const anchor: RefObject<HTMLElement | null>;
declare const trigger: ReactElement<DropdownTriggerProps>;
const anchored: DropdownProps = { anchorRef: anchor, open: true, onOpenChange: () => {}, keyboard: 'content', children: null };
const triggered: DropdownProps = { trigger, defaultOpen: false, children: null };
// @ts-expect-error A real trigger and an external-only anchor are distinct variants.
const conflicting: DropdownProps = { trigger, anchorRef: anchor, children: null };
// @ts-expect-error A controlled owner must receive requests to change open.
const uncontrolledCallback: DropdownProps = { anchorRef: anchor, open: true, children: null };
void [anchored, triggered, conflicting, uncontrolledCallback];

const pointed: DropdownProps = { point: { x: 0, y: 0 }, open: true, onOpenChange: () => {}, initialFocus: 'first', children: null };
// @ts-expect-error Point and DOM geometry are mutually exclusive.
const ambiguousPoint: DropdownProps = { point: { x: 1, y: 1 }, anchorRef: anchor, children: null };
// @ts-expect-error Point and trigger are mutually exclusive.
const pointedTrigger: DropdownProps = { point: null, trigger, children: null };
void [pointed, ambiguousPoint, pointedTrigger];
