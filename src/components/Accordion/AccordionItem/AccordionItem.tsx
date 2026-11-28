'use client';

import { Button, Flex, Text } from '#components';
import type { WithRef } from '#core';
import { ui } from '#ui';
import { accordion } from '../Accordion.config';
import type { AccordionItemProps } from './AccordionItem.types';

export function AccordionItem(props: WithRef<AccordionItemProps, HTMLElement>) {
  const item = ui.disclosure.item.use(accordion, props);

  return (
    <Flex {...item.root}>
      <Text {...item.heading} variant={['inherit', 'inherit', 'inherit']} m={[0, 0, 0]}>
        <Button {...item.trigger}>
          <Text
            as="span"
            variant={['inherit', 'inherit', 'inherit']}
            grow={[1, 1, 1]}
            minW={[0, 0, 0]}
          >
            {props.trigger.content}
          </Text>
          {item.indicator != null && (
            <Flex as="span" aria-hidden grow={[0, 0, 0]} shrink={[0, 0, 0]}>
              {item.indicator}
            </Flex>
          )}
        </Button>
      </Text>
      <Flex {...item.panel}>{props.children}</Flex>
    </Flex>
  );
}
