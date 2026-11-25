import type { RefObject } from 'react';

import type { WithRef } from '../../../src/core';
import type { CollapseControls } from '../../../src/hooks/useCollapseControls';
import type { InputProps } from '../../../src/components/Input/Input.types';
import type { FlexProps } from '../../../src/components/Flex/Flex';
import type { CollapseOptions } from '../../../src/components/Collapse/CollapseWrap';

type Assert<T extends true> = T;
type Uncontrolled = { defaultOpen: false; ref: RefObject<CollapseControls | null> };

/** Эти договоры проверяет tsc: ref поведения не заменяет DOM ref, два владельца запрещены. */
export type CollapseContracts = [
  Assert<Uncontrolled extends CollapseOptions ? true : false>,
  Assert<{ open: true; defaultOpen: false } extends CollapseOptions ? false : true>,
  Assert<{ open: true; defaultOpen: false } extends NonNullable<FlexProps['collapse']> ? false : true>,
  Assert<Uncontrolled extends NonNullable<InputProps['collapse']> ? true : false>,
  Assert<RefObject<HTMLInputElement | null> extends WithRef<InputProps, HTMLInputElement>['ref'] ? true : false>,
  Assert<RefObject<CollapseControls | null> extends WithRef<InputProps, HTMLInputElement>['ref'] ? false : true>,
];

const responsiveGap: CollapseOptions = { defaultOpen: false, gap: [4, 8, 12] };
export const collapseResponsiveGapContract = responsiveGap;
