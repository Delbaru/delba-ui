import assert from 'node:assert/strict';
import test from 'node:test';

import { contentAnimationClass, resolveContentAnimate, stepSwap, type ContentKey, type SwapState } from './contentMotion';

test('animate: ключ, [ключ] и [ключ, { key }] дают один и тот же вход', () => {
    assert.deepEqual(resolveContentAnimate(undefined), {});
    assert.deepEqual(resolveContentAnimate('fadeIn'), { animation: 'fadeIn' });
    assert.deepEqual(resolveContentAnimate(['fadeInUp']), { animation: 'fadeInUp', key: undefined });
    assert.deepEqual(resolveContentAnimate(['fadeInScale', { key: 'tab-2' }]), { animation: 'fadeInScale', key: 'tab-2' });
});

test('класс ухода — зеркало входа; прежний уход в animation остаётся собой', () => {
    assert.equal(contentAnimationClass('fadeInDown', false), 'ui-anim-fadeInDown');
    assert.equal(contentAnimationClass('fadeInDown', true), 'ui-anim-fadeOutUp');
    assert.equal(contentAnimationClass('fadeInUp', true), 'ui-anim-fadeOutDown');
    assert.equal(contentAnimationClass('fadeOut', true), 'ui-anim-fadeOut');
    assert.equal(contentAnimationClass(undefined, true), undefined);
});

const run = (start: SwapState, steps: Array<['sync' | 'end', ContentKey | undefined]>, reduced = false) =>
    steps.reduce((state, [signal, latest]) => stepSwap(state, latest, signal, reduced), start);

test('смена ключа: уход старого, затем вход нового', () => {
    const idle: SwapState = { shown: 'a', phase: 'idle' };
    const exiting = stepSwap(idle, 'b', 'sync', false);
    assert.deepEqual(exiting, { shown: 'a', phase: 'exit' });
    assert.deepEqual(stepSwap(exiting, 'b', 'end', false), { shown: 'b', phase: 'enter' });
});

test('быстрые смены во время ухода склеиваются в последний ключ', () => {
    const state = run({ shown: 'a', phase: 'idle' }, [['sync', 'b'], ['sync', 'c'], ['sync', 'd'], ['end', 'd']]);
    assert.deepEqual(state, { shown: 'd', phase: 'enter' });
});

test('смена во время входа ждёт его конца, затем догоняет', () => {
    const entering: SwapState = { shown: 'b', phase: 'enter' };
    assert.deepEqual(stepSwap(entering, 'c', 'sync', false), entering);
    const idle = stepSwap(entering, 'c', 'end', false);
    assert.deepEqual(idle, { shown: 'b', phase: 'idle' });
    assert.deepEqual(stepSwap(idle, 'c', 'sync', false), { shown: 'b', phase: 'exit' });
});

test('вход без animationend закрывает страховка, и следующая смена применяется', () => {
    // Раньше узел без анимации навсегда оставался во «входе».
    const state = run({ shown: 'a', phase: 'idle' }, [['sync', 'b'], ['end', 'b'], ['end', 'b'], ['sync', 'c']]);
    assert.deepEqual(state, { shown: 'b', phase: 'exit' });
});

test('reduced motion меняет сразу и не оставляет фазы', () => {
    assert.deepEqual(stepSwap({ shown: 'a', phase: 'idle' }, 'b', 'sync', true), { shown: 'b', phase: 'idle' });
    assert.deepEqual(stepSwap({ shown: 'a', phase: 'exit' }, 'c', 'end', true), { shown: 'c', phase: 'idle' });
});

test('лишний конец хода в покое ничего не меняет', () => {
    const idle: SwapState = { shown: 'a', phase: 'idle' };
    assert.equal(stepSwap(idle, 'a', 'end', false), idle);
    assert.equal(stepSwap(idle, 'a', 'sync', false), idle);
});
