'use client';

import { Flex } from '#components';
import type { WithRef } from '#core';
import { ui } from '#ui';
import { accordion } from './Accordion.config';
import type { AccordionProps } from './Accordion.types';

export function Accordion(props: WithRef<AccordionProps, HTMLElement>) {
  const disclosure = ui.disclosure.use(accordion, props);

  return <Flex {...disclosure.root} ui={{ ...disclosure.root.ui, disclosure }} />;
}
