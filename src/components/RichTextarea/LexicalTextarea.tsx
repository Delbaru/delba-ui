'use client';

import type { CSSProperties } from 'react';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { cx, mergeComponentStates, splitBoxLayout, type WithRef } from '../../core';
import { UI_MESSAGES } from '../../core/base/messages';
import { roleFont } from '../../core/base/typography';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { CollapseWrap } from '../Collapse/CollapseWrap';
import { VariableNode } from './lexical/VariableNode/VariableNode';
import { LexicalTextareaEditor } from './LexicalTextareaEditor/LexicalTextareaEditor';
import { LexicalTextareaToolbar } from './LexicalTextareaToolbar/LexicalTextareaToolbar';
import { editorLayout, NO_VARIABLES } from './LexicalTextarea.config';
import { useLexicalTextarea } from './useLexicalTextarea';
import type { LexicalTextareaProps } from './LexicalTextarea.types';
import type { LexicalTextareaHandle } from './types';
import styles from './LexicalTextarea.module.scss';

export type { LexicalTextareaProps } from './LexicalTextarea.types';

/** Formatted document editor; the ref exposes document commands rather than a DOM node. */
export function LexicalTextarea({
  ref, id, className, style, color, placeholder, placeholderColor = 'var(--field-placeholder-color, var(--text-muted))',
  label, labelColor, comment, variant = 'style-1', content, variables = NO_VARIABLES,
  allowLink = true, onChange, minLength, maxLength, error, collapse, state, required,
  emptyMessage = UI_MESSAGES.richTextarea.required, validate, perspective3d, parallax, animate, linkState,
  'data-point-events': dataPointEvents, ...props
}: WithRef<LexicalTextareaProps, LexicalTextareaHandle>) {
  const field = useLexicalTextarea(ref, { id, content, variables, onChange, minLength, maxLength, error, comment, required, emptyMessage, validate });
  const { box } = splitBoxLayout(props);
  const layout = editorLayout(box);
  const fieldState = mergeComponentStates(state, field.feedback.error && 'error');

  const editor = (
    <Flex
        {...layout.root}
        dir={['column', 'column', 'column']}
        position={layout.root.position ?? ['relative', 'relative', 'relative']}
        className={cx('LexicalTextarea', styles.LexicalTextarea, className)}
        style={style}
        perspective3d={perspective3d}
        parallax={parallax}
        animate={animate}
        data-point-events={dataPointEvents}
        linkState={linkState}
    >
      {label && <Text
          id={`${field.id}-label`}
          color={labelColor}
          mb={[8, 4, 8]}
          required={required}
      >{label}</Text>}
      <Flex
          {...layout.field}
          dir={['column', 'column', 'column']}
          position={['relative', 'relative', 'relative']}
          grow={[1, 1, 1]}
          minH={layout.field.minH ?? [220, 220, 220]}
          className={styles.Field}
          style={{ color, '--font-p1': roleFont('body'), '--font-p2': roleFont('body'), '--font-p3': roleFont('body') } as CSSProperties}
          data-state={fieldState ?? undefined}
          role='presentation'
          onClick={() => field.editor.ref.current?.focus()}
      >
        <LexicalComposer initialConfig={{
          namespace: 'SocratLexicalTextarea',
          onError: nextError => { throw nextError; },
          nodes: [VariableNode, ListNode, ListItemNode, LinkNode],
          theme: { text: { underline: styles.underline } },
        }}>
          <LexicalTextareaEditor
              id={field.id}
              editor={field.editor}
              feedback={field.feedback}
              label={label}
              required={required}
              placeholder={placeholder}
              placeholderColor={placeholderColor}
              variant={variant}
          />
          <Flex
              dir={['row', 'row', 'row']}
              justify={['space_between', 'space_between', 'space_between']}
              align={['center', 'center', 'center']}
              wrap={['wrap', 'wrap', 'wrap']}
              gap={[16, 8, 16]}
              mt={[16, 16, 16]}
              pt={[16, 16, 16]}
              borderT={['calc(1 * var(--rpx)) solid var(--line)', 'calc(1 * var(--rpx)) solid var(--line)', 'calc(1 * var(--rpx)) solid var(--line)']}
          >
            <LexicalTextareaToolbar hasVariables={field.hasVariables} allowLink={allowLink} />
            {field.counter.visible && (
              <Text
                  variant={['caption', 'caption', 'caption']}
                  color='var(--text-muted)'
                  whiteSpace={['nowrap', 'nowrap', 'nowrap']}
                  lineHeight={[1, 1, 1]}
              >
                {maxLength != null ? `${field.counter.characters} / ${maxLength}` : field.counter.characters}
              </Text>
            )}
          </Flex>
        </LexicalComposer>
      </Flex>
      {field.feedback.text && (
        <Text
            as='div'
            variant={['caption', 'caption', 'caption']}
            mt={[8, 4, 8]}
            id={field.feedback.id}
            color={field.feedback.color}
            role={field.feedback.error ? 'alert' : undefined}
        >
          {field.feedback.text}
        </Text>
      )}
    </Flex>
  );

  return collapse ? <CollapseWrap {...collapse}>{editor}</CollapseWrap> : editor;
}
