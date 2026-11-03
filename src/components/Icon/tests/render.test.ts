import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type SVGProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Icon } from '../Icon';

function TestIcon(props: SVGProps<SVGSVGElement>) {
  return createElement('svg', props, createElement('path', { d: 'M0 0h24v24H0z' }));
}

test('Icon keeps the link as the interactive owner and renders its optional root frame', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    component: TestIcon,
    href: '/products/ring',
    rootW: 40,
    'aria-label': 'View ring',
  }));

  assert.match(markup, /^<a[^>]*href="\/products\/ring"[^>]*aria-label="View ring"|^<a[^>]*aria-label="View ring"[^>]*href="\/products\/ring"/);
  assert.match(markup, /<div[^>]*class="[^"]*ui-icon-root[^>]*data-icon-root="true"/);
  assert.match(markup, /<svg[^>]*class="[^"]*ui-icon/);
});

test('component source wins over a competing URL in the rendered DOM', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    src: '/icons/unused.svg',
    component: TestIcon,
  }));

  assert.match(markup, /<path d="M0 0h24v24H0z"/);
  assert.doesNotMatch(markup, /data-icon-loading/);
});

test('hover variant composes one stack with ordered default and hover glyphs', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    component: TestIcon,
    hover: TestIcon,
  }));

  assert.match(markup, /data-icon-stack="true"/);
  assert.ok(markup.indexOf('data-icon-layer="default"') < markup.indexOf('data-icon-layer="hover"'));
  assert.match(markup, /data-icon-layer="hover"[^>]*aria-hidden="true"/);
});
