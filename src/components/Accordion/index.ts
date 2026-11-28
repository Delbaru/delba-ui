'use client';

import { Accordion as AccordionRoot } from './Accordion';
import { AccordionItem } from './AccordionItem';

export const Accordion = Object.assign(AccordionRoot, { Item: AccordionItem });
export type { AccordionHeading, AccordionMultipleProps, AccordionProps, AccordionSingleProps } from './Accordion.types';
export type { AccordionItemProps, AccordionItemTriggerOptions } from './AccordionItem';
