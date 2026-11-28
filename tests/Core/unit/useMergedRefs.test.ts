import assert from 'node:assert/strict';
import test from 'node:test';

import { assignRef, mergeRefs } from '../../../src/core/useMergedRefs';

test('assignRef: объектный ref получает узел', () => {
    const ref: { current: string | null } = { current: null };
    assignRef(ref, 'node');
    assert.equal(ref.current, 'node');
});

test('assignRef: функциональный ref вызывается с узлом и с null при размонтировании', () => {
    const calls: Array<string | null> = [];
    const ref = (node: string | null) => {
        calls.push(node);
    };
    assignRef(ref, 'node');
    assignRef(ref, null);
    assert.deepEqual(calls, ['node', null]);
});

test('assignRef: пустой ref ничего не ломает', () => {
    assert.doesNotThrow(() => assignRef(undefined, 'node'));
    assert.doesNotThrow(() => assignRef(null, 'node'));
});

test('assignRef: сохраняет функцию очистки callback-ref React 19', () => {
    const calls: string[] = [];
    const cleanup = assignRef((node: string | null) => {
        calls.push(`attached:${node}`);
        return () => { calls.push('cleanup'); };
    }, 'node');

    assert.deepEqual(calls, ['attached:node']);
    assert.equal(typeof cleanup, 'function');
    cleanup?.();
    assert.deepEqual(calls, ['attached:node', 'cleanup']);
});


test('merged refs beyond three preserve attachment order and React cleanup semantics', () => {
    const calls: string[] = [];
    const object = { current: null as string | null };
    const callback = (label: string) => (node: string | null) => { calls.push(`${label}:${node}`); };
    const bind = mergeRefs(
        callback('first'),
        object,
        undefined,
        (node: string | null) => {
            calls.push(`cleanup-ref:${node}`);
            return () => { calls.push('cleanup'); };
        },
        callback('last'),
    );
    const cleanup = bind('node');
    assert.equal(object.current, 'node');
    assert.deepEqual(calls, ['first:node', 'cleanup-ref:node', 'last:node']);
    assert.equal(typeof cleanup, 'function');
    if (typeof cleanup === 'function') cleanup();
    assert.equal(object.current, null);
    assert.deepEqual(calls, [
        'first:node', 'cleanup-ref:node', 'last:node',
        'first:null', 'cleanup', 'last:null',
    ]);
});
