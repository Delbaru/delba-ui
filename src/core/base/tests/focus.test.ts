import assert from 'node:assert/strict';
import test from 'node:test';

import { focusWhenReady, resolveFocusTarget, shouldYieldFocus } from '../focus';

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


test('focusWhenReady uses the target owner document even without a global document', async () => {
    const owner = { activeElement: null, defaultView: {} } as unknown as Document;
    const node = {
        ownerDocument: owner,
        isConnected: true,
        matches: () => false,
        closest: () => null,
        focus(options: FocusOptions) {
            assert.equal(options.preventScroll, true);
            Object.defineProperty(owner, 'activeElement', { value: node, configurable: true });
        },
    } as unknown as HTMLElement;

    assert.equal(await focusWhenReady(node), true);
});

test('focusWhenReady safely declines a detached document without a view', async () => {
    const node = { ownerDocument: { defaultView: null } } as unknown as HTMLElement;
    assert.equal(await focusWhenReady(node), false);
});
