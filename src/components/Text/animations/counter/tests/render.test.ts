import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Text } from '../../../Text';

test('change counter SSR starts with the complete money value and preserves textual price states', () => {
  const animate = { when: 'change', effect: 'counter', duration: 'fast' } as const;
  const html = renderToStaticMarkup(createElement(Text, { animate }, '1\u00a0499,50 ₽'));
  assert.match(html, /ui-counter-value[^>]*>1 499,50 ₽<\/span>/);
  assert.doesNotMatch(html, /ui-counter-value[^>]*>0/);
  const unavailable = renderToStaticMarkup(createElement(Text, { animate }, 'Цена по запросу'));
  assert.match(unavailable, /Цена по\sзапросу/);
  assert.doesNotMatch(unavailable, /ui-counter/);
});
