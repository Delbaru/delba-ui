import type { TextProps } from './Text.types';

export const DEFAULT_TEXT_VARIANT: TextProps['variant'] = ['body', 'body', 'body'];
export const DEFAULT_TEXT_FORMAT = ['default', 'default', 'default'] as const;

/** Text renderers and the shared glow use spans inside these hosts. */
export const TEXT_PHRASING_HOSTS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo', 'blockquote', 'body',
  'button', 'canvas', 'caption', 'cite', 'code', 'data', 'dd', 'del', 'dfn', 'dialog',
  'div', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'i', 'ins', 'kbd', 'label', 'legend',
  'li', 'main', 'map', 'mark', 'meter', 'nav', 'object', 'output', 'p', 'pre',
  'progress', 'q', 'rt', 'ruby', 's', 'samp', 'search', 'section', 'small', 'span',
  'strong', 'sub', 'summary', 'sup', 'td', 'th', 'time', 'u', 'var',
]);

/** Text-only and raw-text hosts must receive a string for native parsing and values. */
export const TEXT_ONLY_HOSTS = new Set([
  'iframe', 'noembed', 'noframes', 'noscript', 'option', 'plaintext',
  'rp', 'script', 'style', 'textarea', 'title', 'xmp',
]);
