import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Text } from '../../../src/components/Text';

test('shared motion preserves label semantics and adds only decorative phrasing content', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'label',
    htmlFor: 'document-title',
    animate: { appearance: { when: 'load', effect: 'fade' }, idle: { effect: 'glow' } },
  }, 'Document title'));

  assert.match(html, /^<label\b[^>]*\bfor="document-title"/);
  assert.match(html, /data-reveal="fade"/);
  assert.equal(html.match(/<span\b[^>]*aria-hidden="true"/g)?.length, 2);
  assert.match(html, /Document title<\/label>$/);
});

test('text-only hosts omit decorative children', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'option',
    animate: { idle: { effect: 'glow' } },
  }, 'Available'));

  assert.match(html, /^<option\b[^>]*>Available<\/option>$/);
  assert.doesNotMatch(html, /data-ui-idle|<span/);
});

test('an option exposes the final counter text as its native value', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'option',
    animate: { appearance: { when: 'load', effect: 'counter', to: 5, suffix: ' available' } },
  }, '0'));

  assert.match(html, /^<option\b[^>]*>5 available<\/option>$/);
  assert.doesNotMatch(html, /data-reveal|<span/);
});

test('a textarea receives the final timeline value without timeline DOM bindings', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'textarea',
    animate: { appearance: { when: 'inView', effect: { up: {}, counter: { to: 8 } } } },
  }, '0'));

  assert.match(html, /^<textarea\b[^>]*>8<\/textarea>$/);
  assert.doesNotMatch(html, /data-reveal|--text-timeline|<span/);
});

test('options expose the selected sequence step as plain text', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'option',
    animate: { change: { effect: 'textSlide', steps: ['First', 'Second'], currentStep: 1 } },
  }, 'Fallback'));

  assert.match(html, /^<option\b[^>]*>Second<\/option>$/);
});

test('native text keeps literal spaces and formatted line breaks during a text change', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'textarea',
    format: ['breaks', 'breaks', 'breaks'],
    animate: { change: { effect: 'textReveal' } },
  }, 'In a place<br>Next line'));

  assert.match(html, /^<textarea\b[^>]*>In a place\nNext line<\/textarea>$/);
});

test('HTML headings keep their text sequence with phrasing children', () => {
  const html = renderToStaticMarkup(createElement(Text, {
    as: 'h2',
    animate: { change: { effect: 'textClip', steps: ['First', 'Second'], currentStep: 1 } },
  }, 'Fallback'));

  assert.match(html, /^<h2\b[^>]*><span\b.*Second.*<\/span><\/h2>$/);
  assert.doesNotMatch(html, /<div/);
});
