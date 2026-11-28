import { createElement, createRef } from 'react';
import { Accordion, type AccordionItemProps, type AccordionProps } from '../../../src/components/Accordion';

const item = {
  value: 'delivery',
  dir: ['row', null, 'column'],
  trigger: {
    content: createElement('span', null, 'Delivery'),
    w: [320, null, '100%'],
    justifyContent: ['end', null, 'start'],
    textAlign: ['right', null, 'left'],
    onClick(event) { event.preventDefault(); },
    ref: createRef<HTMLButtonElement>(),
  },
  panelProps: { dir: ['row', null, 'column'], ref: createRef<HTMLElement>() },
} as const satisfies AccordionItemProps;

const multiple = { multiple: true, value: ['delivery', 'payment'] } as const satisfies AccordionProps;
const controlledClosed: AccordionProps = { value: null };
const compoundItem = createElement(Accordion.Item, item);

// @ts-expect-error The trigger has an explicit content field.
const bareTrigger: AccordionItemProps = { value: 'delivery', trigger: 'Delivery' };
// @ts-expect-error All trigger settings belong to the trigger object.
const legacySettings: AccordionItemProps = { ...item, triggerProps: { w: [200, 200, 200] } };
// @ts-expect-error Disclosure owns trigger-to-panel ARIA bindings.
const triggerAria: AccordionItemProps = { ...item, trigger: { ...item.trigger, 'aria-expanded': true } };
// @ts-expect-error Disclosure owns the panel ID.
const panelId: AccordionItemProps = { ...item, panelProps: { id: 'arbitrary' } };
// @ts-expect-error Responsive settings have all three D/M/T entries.
const shortTuple: AccordionItemProps = { ...item, trigger: { ...item.trigger, w: [200, null] } };
// @ts-expect-error Multiple groups receive a list of opened keys.
const scalarMultiple: AccordionProps = { multiple: true, value: 'delivery' };

void [multiple, controlledClosed, compoundItem, bareTrigger, legacySettings, triggerAria, panelId, shortTuple, scalarMultiple];
