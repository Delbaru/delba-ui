import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type SVGProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Icon } from '../../../src/components/Icon/Icon';

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
  assert.match(markup, /<span\b[^>]*data-icon-root="true"[^>]*><svg\b/);
});

test('component source wins over a competing URL in the rendered DOM', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    src: '/icons/unused.svg',
    component: TestIcon,
  }));

  assert.match(markup, /^<svg\b[^>]*data-icon-root="true"/);
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

test('plain tooltip anchors to the focusable SVG without adding a wrapper', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    component: TestIcon,
    ui: { popup: { preset: 'tooltip', text: 'Details' } },
    'aria-describedby': 'existing-description',
  }));

  const openingTag = markup.match(/^<svg\b[^>]*>/)?.[0] ?? '';
  assert.match(openingTag, /tabindex="0"/i);
  assert.match(openingTag, /data-ui-popup-trigger=""/);
  assert.match(openingTag, /aria-describedby="existing-description"/);
});

test('linked icon puts the popup trigger on the link even when frame and stack exist', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    component: TestIcon,
    hover: TestIcon,
    rootW: 40,
    href: '/products/ring',
    ui: { popup: { preset: 'tooltip', text: 'Details' } },
  }));

  assert.match(markup, /^<a\b[^>]*data-ui-popup-trigger=""/);
  assert.equal(markup.match(/data-ui-popup-trigger/g)?.length, 1);
});

test('idle glow uses the HTML frame and leaves the glyph structure valid', () => {
  const markup = renderToStaticMarkup(createElement(Icon, {
    component: TestIcon,
    animate: { idle: { effect: 'glow' } },
  }));

  assert.match(markup, /^<span\b[^>]*data-ui-idle="glow"/);
  assert.equal(markup.match(/data-reveal-skip=""/g)?.length, 2);
  assert.match(markup, /<svg\b[^>]*><path[^>]*><\/path><\/svg>/);
});

test('framed Icon stays inline inside a paragraph with collapse and source change', () => {
  const markup = renderToStaticMarkup(createElement('p', null, createElement(Icon, {
    component: TestIcon,
    rootW: 40,
    rootClassName: 'example-icon-frame',
    collapse: { open: true },
    animate: { change: { effect: 'spin' } },
    ui: { popup: { preset: 'tooltip', text: 'Details' } },
    'aria-label': 'Product details',
  })));

  assert.match(markup, /^<p><span\b[^>]*data-ui-collapse=""/);
  assert.match(markup, /--icon-swap-dur:/);
  assert.doesNotMatch(markup, /<\/?div\b/);
  const frame = (markup.match(/<span\b[^>]*>/g) ?? [])
    .find(tag => tag.includes('example-icon-frame')) ?? '';
  assert.match(frame, /data-icon-root="true"/);
  assert.match(frame, /aria-label="Product details"/);
  assert.match(frame, /tabindex="0"/i);
  assert.match(frame, /data-ui-popup-trigger=""/);
  assert.match(markup, /<svg\b[^>]*><path\b/);
});
