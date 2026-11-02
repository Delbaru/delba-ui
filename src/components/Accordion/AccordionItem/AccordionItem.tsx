'use client';

import { useContext, useId } from 'react';
import { cx, mergeComponentStates, type WithRef } from '../../../core';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { AccordionContext } from '../Accordion.model';
import { resolveAccordionItemTrigger } from '../trigger-options';
import type { AccordionItemProps } from '../Accordion.types';
import styles from './AccordionItem.module.scss';

/**
 * Пункт аккордеона. Открытый получает токен `open` в `state` пункта, триггера и панели; индикатор
 * стилизуется через триггер (`[state~='open'] > …`). Свой `state` пункта и `triggerProps.state` склеиваются с ним.
 */
export function AccordionItem({
  ref,
  value,
  trigger,
  children,
  headingAs,
  indicator,
  disabled,
  triggerProps,
  panelProps,
  className,
  ...props
}: WithRef<AccordionItemProps, HTMLElement>) {
  const ctx = useContext(AccordionContext);
  const baseId = useId();
  if (!ctx) throw new Error('AccordionItem живёт только внутри Accordion');

  const open = ctx.selection.isOpen(value);
  const state = open ? 'open' : undefined;
  const Heading = headingAs ?? ctx.headingAs;
  const icon = indicator === undefined ? ctx.indicator : indicator;
  const triggerConfig = resolveAccordionItemTrigger(trigger);
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  return (
    <Flex
        ref={ref}
        {...props}
        className={cx('AccordionItem', styles.AccordionItem, className)}
        state={mergeComponentStates(state, props.state)}
        data-disabled={disabled || undefined}
    >
      <Heading className={styles.heading}>
        <Button
          {...triggerProps}
          {...triggerConfig.props}
          className={cx(styles.trigger, triggerProps?.className, triggerConfig.props.className)}
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          disabled={disabled}
          state={mergeComponentStates(state, triggerProps?.state, triggerConfig.props.state)}
          data-accordion-trigger={ctx.rootId}
          onClick={(event) => {
            ctx.selection.toggle(value);
            ctx.position.hold(event.currentTarget);
          }}
        >
          <span className={styles.label}>{triggerConfig.content}</span>
          {icon != null && (
            <span aria-hidden className={styles.indicator}>{icon}</span>
          )}
        </Button>
      </Heading>
      <Flex
        {...panelProps}
        className={cx(styles.panel, panelProps?.className)}
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        state={mergeComponentStates(state, panelProps?.state)}
        collapse={{
          open,
          fade: true,
          keepMounted: true,
          onFound: () => ctx.selection.reveal(value),
        }}
      >
        {children}
      </Flex>
    </Flex>
  );
}
