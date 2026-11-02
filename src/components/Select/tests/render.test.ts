import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from '../Select';

test('composed SelectTrigger keeps Dropdown accessibility and native form entries', () => {
  const html = renderToStaticMarkup(createElement(Select<string>, {
    id: 'country', label: 'Country', name: 'country', value: 'ru',
    options: [{ value: 'ru', label: 'Russia' }, { value: 'kz', label: 'Kazakhstan' }],
  }));
  assert.match(html, /class="[^"]*SelectTrigger[^"]*"/);
  assert.match(html, /id="country"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-controls="country-listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /type="hidden" name="country" value="ru"/);
  assert.match(html, /Russia/);
});
