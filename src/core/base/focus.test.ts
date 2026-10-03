import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveFocusTarget, shouldYieldFocus } from './focus';

const fakeElement = (editable: boolean) => ({ matches: () => editable }) as unknown as Element;

test('resolveFocusTarget: ref разворачивается, пустое значение — null', () => {
    const node = { tagName: 'TEXTAREA' } as unknown as HTMLElement;

    assert.equal(resolveFocusTarget({ current: node }), node);
    assert.equal(resolveFocusTarget({ current: null }), null);
    assert.equal(resolveFocusTarget(node), node);
    assert.equal(resolveFocusTarget(null), null);
    assert.equal(resolveFocusTarget(undefined), null);
});

test('shouldYieldFocus: уступаем, только если человек ушёл в ДРУГОЕ поле ввода', () => {
    const target = fakeElement(true);
    const initial = fakeElement(false);

    assert.equal(shouldYieldFocus(null, target, initial), false, 'фокуса нет — ставим');
    assert.equal(shouldYieldFocus(target, target, initial), false, 'уже на цели');
    assert.equal(shouldYieldFocus(initial, target, initial), false, 'след клика, запустившего ожидание');
    assert.equal(shouldYieldFocus(fakeElement(false), target, initial), false, 'кнопка — не повод уступать');
    assert.equal(shouldYieldFocus(fakeElement(true), target, initial), true, 'человек печатает в другом поле');
});
