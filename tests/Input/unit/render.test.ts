import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Input } from '../../../src/components/Input/Input';

test('disabled password has no enabled reveal control, while readonly can reveal', () => {
  const render = (disabled: boolean, readOnly = false) => renderToStaticMarkup(
    createElement(Input, { type: 'password', revealable: true, disabled, readOnly }),
  );

  assert.match(render(true), /<input[^>]*disabled=""/);
  assert.doesNotMatch(render(true), /<button\b/);
  assert.match(render(false), /<button[^>]*type="button"/);
  assert.match(render(false, true), /<button[^>]*type="button"/);
});

test('motion belongs to the field frame and preserves the native input contract', () => {
  const html = renderToStaticMarkup(createElement(Input, {
    id: 'title', name: 'title', form: 'editor', label: 'Title',
    type: 'text', defaultValue: 'New entry', nativeValidation: true, required: true,
    animate: { hover: { effect: 'rise' }, idle: { effect: 'glow' } },
  }));
  assert.match(html, /^<div[^>]*data-ui-hover="rise"[^>]*data-ui-idle="glow"/);
  assert.match(html, /<label[^>]*for="title"/);
  const input = html.match(/<input[^>]*>/)?.[0];
  assert.ok(input);
  for (const attribute of ['name="title"', 'form="editor"', 'value="New entry"', 'required=""']) {
    assert.ok(input.includes(attribute));
  }
  assert.doesNotMatch(input, /data-ui-hover|data-ui-idle|data-ui-popup-trigger/);
});
