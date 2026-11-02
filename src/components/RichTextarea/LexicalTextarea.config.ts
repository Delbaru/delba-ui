import type { BoxLayoutProps } from '../../core';
import { UI_MESSAGES, formatUiMessage } from '../../core/base/messages';
import type { LexicalTextareaChangePayload, LexicalTextareaVariable } from './types';

export const NO_VARIABLES: LexicalTextareaVariable[] = [];

/** Layout of the painted editor field, distinct from the outer label/feedback composition. */
const FIELD_LAYOUT = new Set<keyof BoxLayoutProps>([
  'p', 'pt', 'pr', 'pb', 'pl', 'm', 'mt', 'mr', 'mb', 'ml',
  'r', 'tlr', 'trr', 'brr', 'blr', 'borderTLR', 'borderTRR', 'borderBRR', 'borderBLR',
  'border', 'borderC', 'borderS', 'borderW', 'borderT', 'borderR', 'borderB', 'borderL',
  'w', 'minW', 'maxW', 'h', 'minH', 'maxH', 'bg',
]);

export function editorLayout(layout: BoxLayoutProps): { field: BoxLayoutProps; root: BoxLayoutProps } {
  const field: Record<string, unknown> = {};
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(layout)) {
    (FIELD_LAYOUT.has(key as keyof BoxLayoutProps) ? field : root)[key] = value;
  }
  return { field: field as BoxLayoutProps, root: root as BoxLayoutProps };
}

export interface EditorValidationOptions {
  required?: boolean;
  emptyMessage: string;
  minLength?: number;
  maxLength?: number;
  validate?: (payload: LexicalTextareaChangePayload) => string | undefined;
}

/** Required, length and custom validation share the same document snapshot. */
export function validateEditorContent(payload: LexicalTextareaChangePayload, rules: EditorValidationOptions): string | undefined {
  if (rules.required && payload.isEmpty) return rules.emptyMessage;
  if (!payload.isEmpty && rules.minLength != null && payload.characters < rules.minLength) {
    return formatUiMessage(UI_MESSAGES.richTextarea.minLength, { min: rules.minLength });
  }
  if (rules.maxLength != null && payload.characters > rules.maxLength) {
    return formatUiMessage(UI_MESSAGES.richTextarea.maxLength, { max: rules.maxLength });
  }
  return rules.validate?.(payload);
}
