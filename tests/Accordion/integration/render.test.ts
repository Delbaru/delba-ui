import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Accordion } from '../../../src/components/Accordion';

function attribute(markup: string, name: string) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

test('compound items use their local group, render linked panels, and retain closed content', () => {
  const nested = createElement(Accordion, { defaultValue: 'payment', headingAs: 'h4' },
    createElement(Accordion.Item, { value: 'payment', trigger: { content: 'Nested payment' } }, 'Nested details'),
  );
  const markup = renderToStaticMarkup(createElement(Accordion, {
    id: 'help',
    value: 'delivery',
    collapsible: false,
    headingAs: 'h2',
    indicator: createElement('i', { 'aria-label': 'indicator' }),
  },
  createElement(Accordion.Item, { value: 'delivery', trigger: { content: 'Delivery' } }, nested),
  createElement(Accordion.Item, {
    value: 'payment',
    headingAs: 'h5',
    indicator: null,
    disabled: true,
    state: 'open emphasized',
    trigger: { content: 'Payment' },
  }, 'Searchable payment details')));

  const buttons = markup.match(/<button\b[^>]+>/g) ?? [];
  const regions = (markup.match(/<[^>]+>/g) ?? []).filter(tag => attribute(tag, 'role') === 'region');
  assert.equal(buttons.length, 3);
  assert.equal(regions.length, 3);
  assert.deepEqual(buttons.map(button => attribute(button, 'aria-expanded')), ['true', 'true', 'false']);
  assert.deepEqual(buttons.map(button => attribute(button, 'aria-disabled')), ['true', undefined, 'true']);
  assert.match(markup, /<h2\b/);
  assert.match(markup, /<h4\b/);
  assert.match(markup, /<h5\b/);
  assert.match(markup, /<span[^>]+aria-hidden="true"[^>]*><i aria-label="indicator"><\/i><\/span>/);
  assert.equal(markup.match(/aria-label="indicator"/g)?.length, 1);
  assert.match(markup, /state="emphasized"/);
  assert.match(markup, /hidden=""[^>]*inert=""/);
  assert.match(markup, /Searchable payment details/);
  for (const button of buttons) {
    assert.equal(attribute(button, 'type'), 'button');
    const region = regions.find(tag => attribute(tag, 'id') === attribute(button, 'aria-controls'));
    assert.ok(region);
    assert.equal(attribute(region, 'aria-labelledby'), attribute(button, 'id'));
  }
});
