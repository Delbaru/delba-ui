'use client';

import { cx, type WithRef } from '../../core';
import { Flex } from '../Flex';
import { AccordionContext, useAccordion } from './Accordion.model';
import type { AccordionProps } from './Accordion.types';
import styles from './Accordion.module.scss';

/** Accessible single or multiple disclosure group; item panels own collapse. */
export function Accordion(props: WithRef<AccordionProps, HTMLElement>) {
  const accordion = useAccordion(props);

  return (
    <AccordionContext.Provider value={accordion.context}>
      <Flex {...accordion.root} className={cx(styles.Accordion, props.className)} />
    </AccordionContext.Provider>
  );
}
