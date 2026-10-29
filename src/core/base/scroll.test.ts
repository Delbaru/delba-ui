import assert from 'node:assert/strict';
import test from 'node:test';

import { anchorId, gaveUpWaiting, nextStableFrames, registerScrollProvider, resolveScrollTarget, scrollTo, settledForLaunch, unregisterScrollProvider } from './scroll';

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

test('container scroll keeps the document/provider still and cancels only its own previous flight', async () => {
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    let reduced = false;
    let providerCalls = 0;
    const provider = { scrollTo: () => { providerCalls++; } };
    const calls: ScrollToOptions[] = [];
    const viewport = {
        isConnected: true, clientTop: 2, clientHeight: 200, scrollHeight: 1000, scrollTop: 0,
        getBoundingClientRect: () => ({ top: 100 }),
        contains: (node: unknown) => node === target,
        scrollTo: (options: ScrollToOptions) => { calls.push(options); viewport.scrollTop = options.top ?? viewport.scrollTop; },
    };
    let targetOffset = 500;
    const target = {
        isConnected: true,
        getBoundingClientRect: () => ({ top: 102 + targetOffset - viewport.scrollTop, bottom: 142 + targetOffset - viewport.scrollTop }),
    };
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        matchMedia: () => ({ matches: reduced }),
        scrollTo: () => { throw new Error('Must not move the document'); },
        requestAnimationFrame: (callback: FrameRequestCallback) => {
            const id = ++nextFrame;
            frames.set(id, callback);
            queueMicrotask(() => { if (frames.delete(id)) callback(performance.now()); });
            return id;
        },
        cancelAnimationFrame: (id: number) => { frames.delete(id); },
    } });
    registerScrollProvider(provider);
    try {
        const container = viewport as unknown as Element;
        const element = target as unknown as Element;
        assert.deepEqual(await scrollTo(element, { container, block: 'nearest' }), { status: 'finished' });
        assert.equal(viewport.scrollTop, 340, 'nearest aligns only the hidden bottom edge, including the viewport border');
        const count = calls.length;
        await scrollTo(element, { container, block: 'nearest' });
        assert.equal(calls.length, count, 'a visible current item does not move');
        reduced = true;
        targetOffset = 700;
        const first = scrollTo(element, { container, block: 'center' });
        targetOffset = 0;
        const second = scrollTo(element, { container, block: 'nearest' });
        assert.deepEqual(await first, { status: 'interrupted' });
        assert.deepEqual(await second, { status: 'finished' });
        assert.equal(viewport.scrollTop, 0);
        assert.equal(calls.at(-1)?.behavior, 'instant', 'reduced motion keeps the destination');
        assert.equal(providerCalls, 0);
        assert.deepEqual(await scrollTo({} as Element, { container }), { status: 'interrupted' });
    } finally {
        unregisterScrollProvider(provider);
        if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
        if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else Reflect.deleteProperty(globalThis, 'document');
    }
});
