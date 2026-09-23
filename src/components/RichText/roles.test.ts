import assert from 'node:assert/strict';
import test from 'node:test';

import { RICH_ROLES, isRichRole, isTextVariantName, resolveRole, roleClassKeys, tagDefaultRole, textVariantClasses } from './roles';

test('блок без роли класса не получает — его красит вариант текста', () => {
  assert.deepEqual(roleClassKeys(), []);
  assert.deepEqual(roleClassKeys(undefined, undefined, undefined), []);
});

test('заданная роль даёт свой класс, по ширинам — свои', () => {
  assert.deepEqual(roleClassKeys('h3'), ['role-h3']);
  assert.deepEqual(roleClassKeys('h3', 'p', 'subtitle'), ['role-h3', 'role-m-p', 'role-t-subtitle']);
  // Роль только на мобилке: на остальных ширинах блок остаётся за вариантом.
  assert.deepEqual(roleClassKeys(undefined, 'small'), ['role-m-small']);
});

test('мусор в данных пропускается, рендер на нём не падает', () => {
  assert.deepEqual(roleClassKeys('huge', 42, null), []);
  assert.deepEqual(roleClassKeys('p', 'nope'), ['role-p']);
  assert.equal(isRichRole('title'), true);
  assert.equal(isRichRole('h4'), false);
});

test('у каждого тега есть роль по умолчанию из словаря', () => {
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'] as const) {
    assert.ok((RICH_ROLES as readonly string[]).includes(tagDefaultRole(tag)), tag);
  }
});

test('resolveRole: роль полосы, иначе базовая, иначе роль тега', () => {
  assert.equal(resolveRole('h2'), 'h2');
  assert.equal(resolveRole('h4'), 'title');
  assert.equal(resolveRole('h2', 'p'), 'p');
  assert.equal(resolveRole('h2', 'p', 'small', 'dop'), 'p');
  assert.equal(resolveRole('h2', 'p', 'small', 'dop', 'm'), 'small');
  assert.equal(resolveRole('h2', 'p', 'small', 'dop', 't'), 'dop');
  // Своей роли у полосы нет — она наследует десктоп, а без него — тег.
  assert.equal(resolveRole('h2', 'p', undefined, undefined, 'm'), 'p');
  assert.equal(resolveRole('h3', undefined, undefined, undefined, 't'), 'h3');
  // Роль другой полосы на эту не влияет.
  assert.equal(resolveRole('p', undefined, 'h1', undefined, 't'), 'p');
});

test('resolveRole: мусор в данных пропускается', () => {
  assert.equal(resolveRole('h5', 'huge', 42, null, 'm'), 'subtitle');
  assert.equal(resolveRole('p', 'h3', 'nope', undefined, 'm'), 'h3');
});

test('роль-вариант проекта даёт утилиты генератора по полосам', () => {
  assert.deepEqual(textVariantClasses('p3'), ['text_p3']);
  assert.deepEqual(textVariantClasses('h2', 'p1', 'numbersPlus'), ['text_h2', 'm_text_p1', 't_text_numbersPlus']);
  // Роль только на планшете — остальные полосы за вариантом текста.
  assert.deepEqual(textVariantClasses(undefined, null, 'p4'), ['t_text_p4']);
});

test('в класс утилиты не попадает ничего, кроме имени варианта', () => {
  assert.deepEqual(textVariantClasses('p3 evil', '1h', 'a-b'), []);
  assert.deepEqual(textVariantClasses(42, {}, ''), []);
  assert.equal(isTextVariantName('p3'), true);
  assert.equal(isTextVariantName('p3 evil'), false);
});
