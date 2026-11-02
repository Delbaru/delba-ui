import type { ReactElement, RefObject } from 'react';
import type { DropdownProps, DropdownTriggerProps } from '../Dropdown.types';

declare const anchor: RefObject<HTMLElement | null>;
declare const trigger: ReactElement<DropdownTriggerProps>;
const anchored: DropdownProps = { anchorRef: anchor, open: true, onOpenChange: () => {}, keyboard: 'content', children: null };
const triggered: DropdownProps = { trigger, defaultOpen: false, children: null };
// @ts-expect-error A real trigger and an external-only anchor are distinct variants.
const conflicting: DropdownProps = { trigger, anchorRef: anchor, children: null };
// @ts-expect-error A controlled owner must receive requests to change open.
const uncontrolledCallback: DropdownProps = { anchorRef: anchor, open: true, children: null };
void [anchored, triggered, conflicting, uncontrolledCallback];
