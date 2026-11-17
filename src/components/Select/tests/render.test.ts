import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from '../Select';

test('composed SelectTrigger keeps Dropdown accessibility and native form entries', () => {
  const html = renderToStaticMarkup(
    createElement(Select<string>, {
      id: 'country',
      label: 'Country',
      name: 'country',
      value: 'ru',
      options: [
        { value: 'ru', label: 'Russia' },
        { value: 'kz', label: 'Kazakhstan' },
      ],
    }),
  );
  assert.doesNotMatch(html, /class="(?:[^"]* )?SelectTrigger(?: |")/);
  assert.match(html, /id="country"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-controls="country-listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /type="hidden" name="country" value="ru"/);
  assert.match(html, /Russia/);
});

test('custom trigger is named by its visible label without a native label pointing at a div', () => {
  const html = renderToStaticMarkup(
    createElement(Select<string>, {
      id: 'country',
      label: 'Country',
      required: true,
      comment: 'Choose your country',
      'aria-describedby': 'shipping-help',
      options: [{ value: 'ru', label: 'Russia' }],
    }),
  );
  assert.match(html, /aria-labelledby="country-label"/);
  assert.match(html, /<span[^>]*id="country-label"[^>]*>Country<\/span>/);
  assert.doesNotMatch(html, /<label[^>]*for="country"/);
  assert.match(html, /aria-describedby="shipping-help country-comment"/);
  assert.match(html, /id="country-comment"[^>]*>Choose your country</);
});

test('explicit accessible name wins and an error owns the only visible feedback description', () => {
  const html = renderToStaticMarkup(
    createElement(Select<string>, {
      id: 'country',
      label: 'Country',
      'aria-label': 'Delivery destination',
      error: 'Choose a country',
      comment: 'Do not announce this comment',
      options: [{ value: 'ru', label: 'Russia' }],
    }),
  );
  assert.match(html, /aria-label="Delivery destination"/);
  assert.doesNotMatch(html, /aria-labelledby=/);
  assert.match(html, /aria-describedby="country-error"/);
  assert.equal((html.match(/id="country-error"/g) ?? []).length, 1);
  assert.match(html, /id="country-error"[^>]*role="alert"/);
  assert.doesNotMatch(html, /id="country-comment"/);
});

test('loading does not describe an error that the skeleton replaces', () => {
  const html = renderToStaticMarkup(
    createElement(Select<string>, {
      id: 'country',
      loading: true,
      error: 'Choose a country',
      options: [{ value: 'ru', label: 'Russia' }],
    }),
  );
  assert.doesNotMatch(html, /aria-describedby="country-error"/);
  assert.doesNotMatch(html, /id="country-error"/);
});

test('search owns one editable field and keeps the selected id separate from its query', () => {
  const html = renderToStaticMarkup(createElement(Select<string>, {
    id: 'city', name: 'city', label: 'City', value: 'saved',
    search: { value: 'query', onChange() {} },
    options: [{ value: 'saved', label: 'Saved city' }],
  }));
  assert.equal((html.match(/role="combobox"/g) ?? []).length, 1);
  assert.equal((html.match(/id="city"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /role="button"/);
  assert.match(html, /aria-controls="city-listbox"/);
  assert.match(html, /value="Saved city"/);
  assert.match(html, /type="hidden" name="city" value="saved"/);
});

test('required search marks the native combobox while optional search stays optional', () => {
  for (const required of [true, false]) {
    const html = renderToStaticMarkup(createElement(Select<string>, {
      id: 'city', required, name: 'city',
      search: { value: '', onChange() {} }, options: [],
    }));
    const input = html.match(/<input[^>]*role="combobox"[^>]*>/)?.[0];
    assert.ok(input);
    if (required) {
      assert.match(input, / aria-required="true"/);
      assert.match(input, / required=""/);
    } else {
      assert.doesNotMatch(input, / aria-required=/);
      assert.doesNotMatch(input, / required=/);
    }
    assert.doesNotMatch(html, /<div[^>]*aria-required=/);
  }
});
