'use client';

import { Flex } from '../Flex';
import type { WithRef } from '#core';
import { SECTION_DEFAULTS } from './Section.config';
import type { SectionProps } from './Section.types';

export function Section(props: WithRef<SectionProps, HTMLElement>) {
  return <Flex {...SECTION_DEFAULTS} {...props} as="section" />;
}
