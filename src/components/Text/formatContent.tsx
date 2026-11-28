import React from 'react';

import {
  decodeHtmlEntities,
  stripHtmlTags,
  resolveResponsiveInput,
  type ResponsiveValue,
} from '#core';
import { DEFAULT_TEXT_FORMAT } from './Text.config';

export type TextFormat = 'default' | 'plain' | 'breaks';

const splitByBr = (value: string): (string | React.ReactElement)[] => {
  const parts = value.split(/<br\s*\/?\s*>/i);
  return parts.flatMap((part, idx) =>
    idx < parts.length - 1 ? [part, <br key={`br-${idx}`} />] : [part]);
};

/**
 * Форматирует строковый children по пропу `format`: 'plain' декодирует сущности и срезает теги,
 * 'breaks' заменяет <br> на реальные переносы, 'default' — как есть. Не-строки отдаются без изменений.
 */
export function resolveTextContent(
  children: React.ReactNode,
  format: ResponsiveValue<TextFormat> = DEFAULT_TEXT_FORMAT,
): React.ReactNode {
  if (typeof children !== 'string') return children;

  const resolvedFormat = Array.isArray(format)
    ? (resolveResponsiveInput(format)[0] ?? 'default')
    : format;
  const decoded = decodeHtmlEntities(children);

  if (resolvedFormat === 'plain') return stripHtmlTags(decoded);
  if (resolvedFormat === 'breaks') return splitByBr(decoded);
  return children;
}

/** Convert formatted content to one string for native text nodes and values. */
export function resolvePlainTextContent(content: React.ReactNode): string {
  let text = '';
  React.Children.forEach(content, child => {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      text += child;
    } else if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      text += child.type === 'br' ? '\n' : resolvePlainTextContent(child.props.children);
    }
  });
  return text;
}
