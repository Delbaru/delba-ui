'use client';
import type { WithRef } from '../../core';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { TextareaControl } from './TextareaControl/TextareaControl';
import { useTextarea } from './Textarea.model';
import type { TextareaProps } from './Textarea.types';
export type { TextareaProps } from './Textarea.types';
export function Textarea(props: WithRef<TextareaProps, HTMLTextAreaElement>) {
  const textarea = useTextarea(props);
  return (
    <Flex {...textarea.layout} dir={['column', 'column', 'column']} gap={[8, 4, 8]}>
      {textarea.label && (
        <Flex dir={['row', 'row', 'row']} gap={[4, 4, 4]}>
          <Text
              as="label"
              htmlFor={textarea.label.htmlFor}
              variant={['caption', 'caption', 'caption']}
              color={textarea.label.color}
          >
            {textarea.label.text}
          </Text>
          {textarea.label.required && (
            <Text
                as="span"
                aria-hidden="true"
                color="var(--error)"
                variant={['caption', 'caption', 'caption']}
            >
              *
            </Text>
          )}
        </Flex>
      )}
      <TextareaControl control={textarea.control} />
      {textarea.counter.visible && textarea.counter.placement === 'below' && (
        <Text
            variant={['caption', 'caption', 'caption']}
            color="var(--text-muted)"
            textAlign={['right', 'right', 'right']}
            w={['100%', '100%', '100%']}
            aria-live="polite"
        >
          {textarea.counter.text}
        </Text>
      )}
      {textarea.comment.text && (
        <Text
            id={textarea.comment.id}
            color={textarea.comment.color}
            pl={textarea.comment.paddingLeft}
            variant={['caption', 'caption', 'caption']}
        >
          {textarea.comment.text}
        </Text>
      )}
    </Flex>
  );
}
