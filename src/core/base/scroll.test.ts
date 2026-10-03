import assert from 'node:assert/strict';
import test from 'node:test';

import { anchorId, gaveUpWaiting, nextStableFrames, resolveScrollTarget, settledForLaunch } from './scroll';

const fakeElement = () => ({ tagName: 'DIV' }) as unknown as Element;

test('anchorId: якорь с решёткой и без — один id', () => {
    assert.equal(anchorId('question-1'), 'question-1', 'голый id — уже якорь');
    assert.equal(anchorId('#question-1'), 'question-1', 'решётка снимается');
});

test('resolveScrollTarget: ref разворачивается, пустое значение — null', () => {
    const node = fakeElement();

    assert.equal(resolveScrollTarget({ current: node }), node);
    assert.equal(resolveScrollTarget({ current: null }), null);
    assert.equal(resolveScrollTarget(node), node);
    assert.equal(resolveScrollTarget(null), null);
    assert.equal(resolveScrollTarget(undefined), null);
});

test('nextStableFrames: счёт копится только у существующей цели на неизменном месте', () => {
    assert.equal(nextStableFrames(true, true, 3), 4, 'стоячая раскладка — кадр в копилку');
    assert.equal(nextStableFrames(true, false, 3), 0, 'цель сдвинулась — счёт заново');
    assert.equal(nextStableFrames(false, true, 3), 0, 'цели нет — ждать появления, не копить');
});

test('settledForLaunch: едем по устоявшимся кадрам или по тайм-ауту, но только с целью', () => {
    assert.equal(settledForLaunch(true, 6, 100), true, 'раскладка устоялась — старт');
    assert.equal(settledForLaunch(true, 2, 100), false, 'мало кадров — рано');
    assert.equal(settledForLaunch(true, 2, 1201), true, 'ждать дольше некогда — едем как есть');
    assert.equal(settledForLaunch(false, 6, 100), false, 'без цели ехать не к чему');
});

test('gaveUpWaiting: цель не появилась вдвое дольше отведённого — уступить', () => {
    assert.equal(gaveUpWaiting(1200), false, 'первый тайм-аут ещё позволяет ехать');
    assert.equal(gaveUpWaiting(2401), true, 'двойной — цели не будет');
});
