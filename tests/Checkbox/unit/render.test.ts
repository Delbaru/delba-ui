import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Checkbox } from '../../../src/components/Checkbox';

test('checkbox motion stays on its label while native inputs own form semantics', () => {
  const html = renderToStaticMarkup(createElement(Checkbox, {
    id: 'agreement', name: 'agreement', form: 'editor', defaultChecked: true,
    animate: { hover: { effect: 'rise' }, idle: { effect: 'glow' } },
  }, 'Accept'));
  assert.match(html, /^<label[^>]*for="agreement"[^>]*data-ui-hover="rise"[^>]*data-ui-idle="glow"/);
  assert.equal((html.match(/data-reveal-skip=""/g) ?? []).length, 2);
  const input = html.match(/<input[^>]*>/)?.[0];
  assert.ok(input);
  for (const attribute of ['id="agreement"', 'type="checkbox"', 'name="agreement"', 'form="editor"', 'checked=""']) {
    assert.ok(input.includes(attribute));
  }
  assert.doesNotMatch(input, /data-ui-hover|data-ui-idle/);
});
