import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractUtilityRules } from '../../../tools/utilities/extract';
import { resolveUtility } from '../utilities/registry';
import { TEXT_ROLES, textFont } from './typography';

const text = resolveUtility('text');
const rulesOf = (typography?: readonly string[]) =>
  new Map(extractUtilityRules([], typography ? { typography } : {}).filter((rule) => rule.utility === text).map((rule) => [rule.className, rule.declaration]));

test('проект без своего набора — прежние варианты, роли и inherit', () => {
  const rules = rulesOf();
  for (const name of ['text_p', 'text_small', 'text_dop', 'text_subtitle', 'text_h4', 'text_numbersPlus', 'text_body', 'text_caption', 'text_micro', 'text_inherit']) assert.ok(rules.has(name), name);
  assert.ok(!rules.has('text_p4'));
  assert.equal(rules.get('text_small'), 'font: var(--font-small); text-transform: var(--tt-small); letter-spacing: var(--ls-small)');
  assert.match(rules.get('text_numbersPlus') ?? '', /var\(--font-numbers-plus\)/);
});

test('проект со своим набором — только его варианты и роли', () => {
  const rules = rulesOf(['h1', 'p4']);
  for (const name of ['text_h1', 'text_p4', 'm_text_p4', 'text_body', 'text_caption', 'text_micro', 'text_inherit']) assert.ok(rules.has(name), name);
  for (const name of ['text_p', 'text_small', 'text_h2']) assert.ok(!rules.has(name), name);
  assert.equal(rules.get('text_p4'), 'font: var(--font-p4); text-transform: var(--tt-p4); letter-spacing: var(--ls-p4)');
});

test('роль читает свой токен с фолбэком на прежний вариант', () => {
  assert.equal(rulesOf(['p1']).get('text_caption'), 'font: var(--font-caption, var(--font-small)); text-transform: var(--tt-caption, var(--tt-small)); letter-spacing: var(--ls-caption, var(--ls-small))');
  assert.equal(textFont('body'), 'var(--font-body, var(--font-p))');
  assert.equal(textFont('h1'), 'var(--font-h1)');
});

test('карта ролей в SCSS совпадает с TEXT_ROLES', () => {
  const mixins = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_mixins.scss'), 'utf8');
  const map = /\$text-roles:\s*\(([^)]*)\)/.exec(mixins)?.[1] ?? '';
  const scss = Object.fromEntries([...map.matchAll(/(\w+):\s*(\w+)/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(scss, { ...TEXT_ROLES });
});
