import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Textarea } from '../Textarea';

test('multiline composition forwards native form props and labels the real field', () => {
  const html = renderToStaticMarkup(createElement(Textarea, {
    id: 'message', label: 'Message', name: 'message', form: 'contact',
    value: 'hello', rows: 4, length: { max: 20 }, readOnly: true,
    comment: 'Hint', 'aria-describedby': 'external',
  }));
  assert.match(html, /class="[^"]*Textarea[^"]*"/);
  assert.match(html, /class="[^"]*TextareaControl[^"]*"/);
  assert.match(html, /<label[^>]*for="message"/);
  assert.match(html, /<textarea[^>]*name="message"[^>]*form="contact"/);
  assert.match(html, /rows="4"/);
  assert.match(html, /maxLength="20"/i);
  assert.match(html, /aria-describedby="external message-comment"/);
  assert.match(html, /5\/20/);
  assert.match(html, />hello<\/textarea>/);
});

test('multiline loading preserves requested skeleton rows and removes native editing', () => {
  const html = renderToStaticMarkup(createElement(Textarea, { loading: true, rows: 2 }));
  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /TextareaControl/);
});
