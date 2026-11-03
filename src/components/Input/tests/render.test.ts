import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Input } from '../Input';

test('disabled password has no enabled reveal control, while readonly can reveal', () => {
  const render = (disabled: boolean, readOnly = false) => renderToStaticMarkup(
    createElement(Input, { type: 'password', revealable: true, disabled, readOnly }),
  );

  assert.match(render(true), /<input[^>]*disabled=""/);
  assert.doesNotMatch(render(true), /role="button"/);
  assert.match(render(false), /role="button"[^>]*tabindex="0"/);
  assert.match(render(false, true), /role="button"[^>]*tabindex="0"/);
});
