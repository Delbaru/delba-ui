import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextClip } from '../TextClip';

test('repeated labels retain distinct steps and only the selected label is accessible', () => {
  const warnings: string[] = [];
  const error = console.error;
  console.error = (...values: unknown[]) => warnings.push(values.map(String).join(' '));
  try {
    const html = renderToStaticMarkup(createElement(TextClip, {
      content: 'Same label',
      options: { steps: ['Same label', 'Same label'], currentStep: 1 },
    }));
    assert.equal((html.match(/Same label/g) ?? []).length, 2);
    assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 1);
    assert.match(html, /class="[^"]*TextClip/);
    assert.equal(warnings.some((warning) => /same key/i.test(warning)), false);
  } finally {
    console.error = error;
  }
});
