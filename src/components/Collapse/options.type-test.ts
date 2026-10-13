import type { RefObject } from 'react';

import type { WithRef } from '../../core';
import type { CollapseControls } from '../../hooks/useCollapseControls';
import type { InputProps } from '../Input/types';
import type { FlexProps } from '../Flex/Flex';
import type { CollapseOptions } from './CollapseWrap';

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
