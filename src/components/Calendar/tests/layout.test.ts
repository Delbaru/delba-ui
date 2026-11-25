import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { exactRules } from '../../../core/utilities/rules';
import { resolveUtility } from '../../../core/utilities/registry';
import { Calendar } from '../Calendar';

test('calendar preserves all dates while allowing its surface and day columns to shrink', () => {
  const html = renderToStaticMarkup(createElement(Calendar, {
    value: '2026-11-23',
    onValueChange() {},
  }));
  const root = html.match(/<div\b[^>]*role="group"[^>]*>/)?.[0];
  assert.ok(root);
  const maximumWidth = resolveUtility('maxW');
  const width = resolveUtility('w');
  assert.ok(maximumWidth && width);
  for (const rule of exactRules(maximumWidth, ['100%', '100%', '100%']))
    assert.ok(root.includes(rule.className), 'calendar must fit its parent');

  const days = [...html.matchAll(/<button\b[^>]*aria-pressed="(?:true|false)"[^>]*>/g)];
  assert.equal(days.length, 42, 'responsive layout preserves six complete weeks');
  for (const [day] of days) {
    for (const rule of exactRules(width, ['100%', '100%', '100%']))
      assert.ok(day.includes(rule.className), 'day must fill its flexible grid column');
    for (const rule of exactRules(width, [40, 40, 40]))
      assert.ok(!day.includes(rule.className), 'day must not force a fixed-width calendar');
  }
});
