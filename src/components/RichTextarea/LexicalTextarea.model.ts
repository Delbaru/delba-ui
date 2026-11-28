import {
  boxLayout, createLayoutClasses, cx, mergeComponentStates, splitBoxLayout, type WithRef,
} from '#core';
import { useInteractiveElement } from '#core/Element';
import { UI_MESSAGES } from '../../core/base/messages';
import {
  DEFAULT_EDITOR_PLACEHOLDER_COLOR, DEFAULT_EDITOR_VARIANT, editorLayout, NO_VARIABLES,
} from './LexicalTextarea.config';
import type { LexicalTextareaProps } from './LexicalTextarea.types';
import type { LexicalTextareaHandle } from './types';
import { useLexicalTextarea } from './useLexicalTextarea';
import styles from './LexicalTextarea.module.scss';

const c = createLayoutClasses();

export function useLexicalTextareaSurface({
  ref, id, className, style, color, placeholder, placeholderColor = DEFAULT_EDITOR_PLACEHOLDER_COLOR,
  label, labelColor, comment, variant = DEFAULT_EDITOR_VARIANT, content, variables = NO_VARIABLES,
  allowLink = true, onChange, minLength, maxLength, error, collapse, state, required,
  emptyMessage = UI_MESSAGES.richTextarea.required, validate, perspective3d, parallax, animate,
  linkState, ui, 'data-point-events': dataPointEvents, ...props
}: WithRef<LexicalTextareaProps, LexicalTextareaHandle>) {
  const field = useLexicalTextarea(ref, {
    id, content, variables, onChange, minLength, maxLength, error, comment, required, emptyMessage, validate,
  });
  const { box } = splitBoxLayout(props);
  const layout = editorLayout(box);
  const popup = collapse?.open === false ? undefined : ui?.popup;
  const element = useInteractiveElement({
    motion: { perspective3d, parallax, animate },
    popup,
    linkState,
    className: cx(
      styles.LexicalTextarea,
      ...boxLayout(c, { ...layout.root, position: layout.root.position ?? ['relative', 'relative', 'relative'] }),
      className,
    ),
    root: { style, tabIndex: popup && popup.preset !== 'tooltip' ? 0 : undefined },
  });

  return {
    ...element,
    root: {
      ...element.root,
      'data-point-events': dataPointEvents,
      'data-ui-collapse-layout': '',
    },
    collapse,
    label: label ? { id: `${field.id}-label`, color: labelColor, required, children: label } : undefined,
    feedback: field.feedback,
    field: {
      ...field,
      layout: layout.field,
      label,
      required,
      placeholder,
      placeholderColor,
      variant,
      allowLink,
      color,
      state: mergeComponentStates(state, field.feedback.error && 'error'),
      focus: () => field.editor.ref.current?.focus(),
    },
  };
}
