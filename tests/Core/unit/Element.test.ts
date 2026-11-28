import assert from 'node:assert/strict';
import test from 'node:test';
import type { MouseEvent } from 'react';
import { composeElementEvents, splitElementEvents } from '../../../src/core/Element/Element.events';

function click() {
    return {
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
    } as MouseEvent<HTMLElement>;
}

test('element layers preserve tooltip, motion, user, intent and popup order', () => {
    const calls: string[] = [];
    const events = composeElementEvents([
        { handlers: { onMouseEnter: () => { calls.push('tooltip'); } } },
        { handlers: { onMouseEnter: () => { calls.push('motion'); } } },
        { handlers: { onMouseEnter: () => { calls.push('user'); } } },
        { handlers: { onMouseEnter: () => { calls.push('intent'); } } },
        { handlers: { onMouseEnter: () => { calls.push('popup'); } } },
    ]);
    events.onMouseEnter?.(click());
    assert.deepEqual(calls, ['tooltip', 'motion', 'user', 'intent', 'popup']);
});

test('preventDefault cancels only explicitly cancelable later actions', () => {
    const calls: string[] = [];
    const events = composeElementEvents([
        { handlers: { onClick: event => { event.preventDefault(); calls.push('user'); } } },
        { handlers: { onClick: () => { calls.push('selection'); } } },
        { handlers: { onClick: () => { calls.push('popup'); } }, cancelable: ['onClick'] },
        { handlers: { onClick: () => { calls.push('observer'); } } },
    ]);
    events.onClick?.(click());
    assert.deepEqual(calls, ['user', 'selection', 'observer']);
});

test('a canceled keyboard event skips every cancelable downstream action', () => {
    const calls: string[] = [];
    const events = composeElementEvents([
        { handlers: { onKeyDown: event => { event.preventDefault(); } } },
        { handlers: { onKeyDown: () => { calls.push('popup'); } }, cancelable: true },
        { handlers: { onKeyDown: () => { calls.push('selection'); } }, cancelable: true },
    ]);
    events.onKeyDown?.(click() as unknown as import('react').KeyboardEvent<HTMLElement>);
    assert.deepEqual(calls, []);
});


test('surface splitting keeps DOM data and attributes while composing event handlers', () => {
    const onClick = () => {};
    const root = { onClick, id: 'save', 'data-kind': 'control', title: 'Save' };
    const { attributes, handlers } = splitElementEvents(root);
    assert.deepEqual(attributes, { id: 'save', 'data-kind': 'control', title: 'Save' });
    assert.equal(handlers.onClick, onClick);
});
