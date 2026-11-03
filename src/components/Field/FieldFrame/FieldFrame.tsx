'use client';

import type { ReactNode } from 'react';
import { cx, type WithRef } from '../../../core';
import styles from './FieldFrame.module.scss';

import type { FlexProps } from '../../Flex/Flex';

import { Flex } from '../../Flex';
import { Text } from '../../Text';

/** Shared field presentation; input modes and commands belong to the caller. */
export function FieldFrame({ layout, label, feedback, children }: FieldFrameProps) {
  return (
    <Flex
        {...layout}
        className={cx(styles.FieldFrame, layout.className)}
        dir={['column', 'column', 'column']}
    >
      {label && (
        <Flex dir={['row', 'row', 'row']} gap={[4, 4, 4]} mb={[8, 8, 8]}>
          <Text
              as={label.htmlFor ? 'label' : 'span'}
              id={label.id}
              htmlFor={label.htmlFor}
              onClick={label.activate}
              variant={['caption', 'caption', 'caption']}
              color={label.color}
          >
            {label.text}
          </Text>
          {label.required && (
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

      {children}

      <Flex dir={['column', 'column', 'column']}>
        <Text
            id={feedback.error.id}
            role={feedback.error.role}
            color={feedback.error.color}
            className={feedback.error.className}
            variant={['caption', 'caption', 'caption']}
            collapse={{ open: Boolean(feedback.error.text), gap: [8, 8, 8], fade: true }}
        >
          {feedback.error.text}
        </Text>

        {feedback.comment?.text && (
          <Text
              id={feedback.comment.id}
              color={feedback.comment.color}
              pl={feedback.comment.paddingLeft}
              pt={[8, 8, 8]}
              variant={['caption', 'caption', 'caption']}
          >
            {feedback.comment.text}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}

export interface FieldLabel {
  /** Native target; custom controls use id + activate. */
  htmlFor?: string;
  id?: string;
  activate?: () => void;
  text: string;
  required?: boolean;
  color?: string;
}

export interface FieldMessage {
  id?: string;
  text?: string;
  color?: string;
  role?: 'alert';
  className?: string;
  paddingLeft?: FlexProps['pl'];
}

export interface FieldFeedback {
  error: FieldMessage;
  comment?: FieldMessage;
}

export interface FieldFrameProps {
  layout: WithRef<Omit<FlexProps, 'children'>, HTMLElement> & {
    'data-point-events'?: string;
  };
  label?: FieldLabel;
  feedback: FieldFeedback;
  children: ReactNode;
}
