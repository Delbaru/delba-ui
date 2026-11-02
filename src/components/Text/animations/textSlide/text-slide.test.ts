import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TextSlide } from './TextSlide';

test('sequence entries with repeated labels render as distinct keyed steps', () => {
  const warnings: string[] = [];
  const originalError = console.error;
  console.error = (...values: unknown[]) => warnings.push(values.map(String).join(' '));
  try {
    const html = renderToStaticMarkup(
      createElement(TextSlide, {
        content: 'Repeated step',
        options: { steps: ['Repeated step', 'Repeated step'], currentStep: 0 },
      }),
    );
    assert.equal((html.match(/Repeated step/g) ?? []).length, 2);
    assert.equal(
      warnings.some((warning) => /same key/i.test(warning)),
      false,
      warnings.join('\n'),
    );
  } finally {
    console.error = originalError;
  }
});
