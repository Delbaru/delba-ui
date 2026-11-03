import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('responsive choices hide their real roots through layout utilities without legacy attributes', () => {
  const { ChoiceButtons } = createRequire(import.meta.url)('../ChoiceButtons.tsx') as typeof import('../ChoiceButtons');
  const html = renderToStaticMarkup(createElement(ChoiceButtons, {
    items: [{ value: 'one', label: 'One' }],
    value: 'one', name: 'choice',
  }));
  assert.doesNotMatch(html, /data-hide-(?:mobile|tablet|pc|desktop)/);
  const roots = [...html.matchAll(/<[^>]+class="([^"]+)"[^>]*>/g)].filter((match) => /(?:^| )[nd]_hide_true(?: |$)/.test(match[1] ?? ''));
  assert.equal(roots.length, 2);
  assert.match(roots[0]?.[1] ?? '', /\bn_hide_true\b/);
  assert.doesNotMatch(roots[0]?.[1] ?? '', /(?:^| )hide_true(?: |$)/);
  assert.match(roots[1]?.[1] ?? '', /\bd_hide_true\b/);
  assert.doesNotMatch(roots[1]?.[1] ?? '', /\b[nt]_hide_true\b/);
});
