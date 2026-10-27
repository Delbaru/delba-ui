import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Grid, GridItem } from './Grid';

test('layout mode server-renders visible keyed content without a presence wrapper', () => {
  const html = renderToString(createElement(Grid, { animate: { when: 'change', effect: 'layout' } },
    createElement(GridItem, { key: 'product-id' }, 'Published product')));
  assert.match(html, /data-grid-layout-key="product-id"/);
  assert.match(html, />Published product<\/div><\/div>$/);
  assert.doesNotMatch(html, /opacity:0|inert|data-grid-layout-exit/);
});
