import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

import {
    anchorId, cancelActiveScroll, gaveUpWaiting, nextStableFrames, registerScrollProvider, resolveScrollTarget, scrollTo,
    settledForLaunch, unregisterScrollProvider, type ScrollProviderApi, type ScrollResult,
} from '../../../../src/core/base/scroll';

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

function exposeDocument(t: TestContext, ids = new Map<string, Element>(), view?: object) {
    const values = {
        document: {
            getElementById: (id: string) => ids.get(id) ?? null,
            documentElement: { scrollHeight: 4000 },
        },
        window: view ?? {
            scrollTo() { assert.fail('Container scrolling must not move the document'); },
            requestAnimationFrame() { assert.fail('Container scrolling must schedule frames in its owner window'); },
        },
    };
    for (const [key, value] of Object.entries(values)) {
        const previous = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, value });
        t.after(() => {
            if (previous) Object.defineProperty(globalThis, key, previous);
            else Reflect.deleteProperty(globalThis, key);
        });
    }
}

function frameClock() {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    let time = 0;
    const advance = (count: number, stepMs = 16) => {
        for (let index = 0; index < count; index++) {
            time += stepMs;
            for (const [id, callback] of [...frames]) {
                if (frames.delete(id)) callback(time);
            }
        }
    };
    return {
        performance: { now: () => time },
        requestAnimationFrame(callback: FrameRequestCallback) {
            const id = ++nextFrame;
            frames.set(id, callback);
            return id;
        },
        cancelAnimationFrame(id: number) {
            frames.delete(id);
        },
        advance,
        settle() {
            for (let remaining = 40; frames.size && remaining > 0; remaining--) advance(1);
            assert.equal(frames.size, 0, 'A settled viewport has no pending frames');
        },
        get frameCount() { return frames.size; },
    };
}

function viewportFixture() {
    const clock = frameClock();
    const layout = { targetOffset: 500, reducedMotion: false, targetInside: true };
    const nativeWrites: ScrollToOptions[] = [];
    const ownerDocument = {
        defaultView: {
            ...clock,
            matchMedia: () => ({ matches: layout.reducedMotion }),
        },
        getElementById(id: string): Element | null {
            return id === 'entry' ? target as unknown as Element : null;
        },
    };
    const viewport = {
        ownerDocument,
        isConnected: true, clientTop: 2, clientHeight: 200, scrollHeight: 1000, scrollTop: 0,
        getBoundingClientRect: () => ({ top: 100 }),
        contains: (node: unknown) => layout.targetInside && node === target,
        scrollTo(options: ScrollToOptions) {
            nativeWrites.push(options);
            viewport.scrollTop = options.top ?? viewport.scrollTop;
        },
    };
    const target = {
        isConnected: true,
        getBoundingClientRect() {
            const top = 102 + layout.targetOffset - viewport.scrollTop;
            return { top, bottom: top + 40 };
        },
    };

    return {
        clock, layout, nativeWrites, viewport,
        container: viewport as unknown as Element,
        element: target as unknown as Element,
    };
}

test('native container scroll uses its own window and cancels its previous flight', async (t) => {
    exposeDocument(t);
    const scope = viewportFixture();
    const { container, element, layout, nativeWrites, viewport } = scope;
    const provider = { scrollTo() { assert.fail('A container flight must not call the document provider'); } };
    registerScrollProvider(provider);
    t.after(() => unregisterScrollProvider(provider));

    const nearest = scrollTo(element, { container, block: 'nearest' });
    scope.clock.settle();
    assert.deepEqual(await nearest, { status: 'finished' });
    assert.equal(viewport.scrollTop, 340, 'Nearest aligns only the hidden bottom edge, including the viewport border');
    assert.equal(nativeWrites.at(-1)?.behavior, 'smooth');
    const count = nativeWrites.length;
    const visible = scrollTo(element, { container, block: 'nearest' });
    scope.clock.settle();
    assert.deepEqual(await visible, { status: 'finished' });
    assert.equal(nativeWrites.length, count, 'A visible item keeps its position');

    layout.reducedMotion = true;
    layout.targetOffset = 700;
    const first = scrollTo(element, { container, block: 'center' });
    layout.targetOffset = 0;
    const second = scrollTo(element, { container, block: 'nearest' });
    scope.clock.settle();
    assert.deepEqual(await first, { status: 'interrupted' });
    assert.deepEqual(await second, { status: 'finished' });
    assert.equal(viewport.scrollTop, 0);
    assert.equal(nativeWrites.at(-1)?.behavior, 'instant');
    assert.deepEqual(await scrollTo({} as Element, { container }), { status: 'interrupted' });
});

test('registered container forwards alignment and waits for the provider to reach its destination', async (t) => {
    const scope = viewportFixture();
    const { container, element, viewport } = scope;
    exposeDocument(t, new Map([['pane', container], ['entry', fakeElement()]]));
    const offset = () => 21;
    const launches: Parameters<ScrollProviderApi['scrollTo']>[] = [];
    const destinationChecks: Parameters<NonNullable<ScrollProviderApi['getTargetTop']>>[] = [];
    let moving = true;
    const provider: ScrollProviderApi = {
        scrollTo(...args) { launches.push(args); },
        isMoving: () => moving,
        getTargetTop(...args) {
            destinationChecks.push(args);
            return 317;
        },
        stop() { assert.fail('An active provider controls its own travel time'); },
    };
    registerScrollProvider(provider, container);
    try {
        let result: ScrollResult | undefined;
        const flight = scrollTo('#entry', { container: '#pane', block: 'center', offset });
        void flight.then(value => { result = value; });
        assert.deepEqual(launches, [[element, { block: 'center', offset }]]);
        assert.deepEqual(scope.nativeWrites, []);
        viewport.scrollTop = 80;
        scope.clock.advance(10, 400);
        await Promise.resolve();
        assert.equal(result, undefined, 'A moving provider may hold the same position beyond the native timeout');
        assert.deepEqual(destinationChecks, []);

        viewport.scrollTop = 317;
        moving = false;
        scope.clock.advance(1);
        assert.deepEqual(destinationChecks, [], 'The position must settle before sampling the destination');
        scope.clock.settle();
        assert.deepEqual(await flight, { status: 'finished' });
        assert.deepEqual(destinationChecks, [[element, { block: 'center', offset }]]);
    } finally {
        unregisterScrollProvider(provider, container);
    }
});

test('replacing and unregistering a container flight stops only its own provider', async (t) => {
    exposeDocument(t);
    const left = viewportFixture();
    const right = viewportFixture();
    const stops: string[] = [];
    let rightMoving = true;
    const original: ScrollProviderApi = {
        scrollTo() {},
        isMoving: () => true,
        stop() { stops.push('original'); },
    };
    const replacement: ScrollProviderApi = {
        scrollTo() {},
        isMoving: () => true,
        stop() { stops.push('replacement'); },
    };
    const neighbor: ScrollProviderApi = {
        scrollTo() {},
        isMoving: () => rightMoving,
        stop() { stops.push('neighbor'); },
        getTargetTop: () => 300,
    };
    registerScrollProvider(original, left.container);
    registerScrollProvider(neighbor, right.container);
    t.after(() => {
        unregisterScrollProvider(original, left.container);
        unregisterScrollProvider(replacement, left.container);
        unregisterScrollProvider(neighbor, right.container);
    });

    const first = scrollTo(left.element, { container: { current: left.container } });
    const independent = scrollTo(right.element, { container: right.container });
    registerScrollProvider(replacement, left.container);
    unregisterScrollProvider(original, left.container);
    assert.deepEqual(stops, []);

    const second = scrollTo(left.element, { container: left.container });
    assert.deepEqual(stops, ['original']);
    assert.deepEqual(await first, { status: 'interrupted' });
    unregisterScrollProvider(replacement, left.container);
    assert.deepEqual(stops, ['original', 'replacement']);
    assert.deepEqual(await second, { status: 'interrupted' });
    assert.equal(left.clock.frameCount, 0);

    rightMoving = false;
    right.viewport.scrollTop = 100;
    right.clock.settle();
    assert.deepEqual(await independent, { status: 'interrupted' }, 'An idle provider stopped short of its destination');
    assert.deepEqual(stops, ['original', 'replacement']);
});

test('a provider flight is interrupted when its target moves to another container', async (t) => {
    exposeDocument(t);
    const { clock, container, element, layout } = viewportFixture();
    let stops = 0;
    const provider: ScrollProviderApi = {
        scrollTo() {},
        isMoving: () => true,
        stop() { stops++; },
    };
    registerScrollProvider(provider, container);
    t.after(() => unregisterScrollProvider(provider, container));

    const flight = scrollTo(element, { container });
    layout.targetInside = false;
    assert.equal(element.isConnected, true);
    clock.advance(1);
    assert.equal(clock.frameCount, 0);
    assert.deepEqual(await flight, { status: 'interrupted' });
    assert.equal(stops, 1);
});

test('an idle provider that can no longer resolve the target reports interruption after movement', async (t) => {
    exposeDocument(t);
    const { clock, container, element, viewport } = viewportFixture();
    const provider: ScrollProviderApi = {
        scrollTo() { viewport.scrollTop = 80; },
        isMoving: () => false,
        getTargetTop: () => null,
    };
    registerScrollProvider(provider, container);
    t.after(() => unregisterScrollProvider(provider, container));

    const flight = scrollTo(element, { container });
    clock.settle();
    assert.deepEqual(await flight, { status: 'interrupted' });
});

test('cancelling native window scroll freezes its current position and detaching the target interrupts a flight', async (t) => {
    const clock = frameClock();
    const inner = viewportFixture();
    const started: ScrollIntoViewOptions[] = [];
    const nativeWrites: ScrollToOptions[] = [];
    const view = {
        ...clock,
        scrollX: 8,
        scrollY: 130,
        scrollTo(options: ScrollToOptions) { nativeWrites.push(options); },
    };
    const target = {
        isConnected: true,
        getBoundingClientRect: () => ({ top: 1000 - view.scrollY }),
        scrollIntoView(options: ScrollIntoViewOptions) { started.push(options); },
    };
    const element = target as unknown as Element;
    exposeDocument(t, new Map(), view);
    try {
        const cancelled = scrollTo(element);
        clock.advance(10);
        assert.deepEqual(started, [{ block: 'start', behavior: 'smooth' }]);

        const inside = scrollTo(inner.element, { container: inner.container });
        inner.clock.settle();
        assert.deepEqual(await inside, { status: 'finished' });
        assert.equal(clock.frameCount, 1, 'The document keeps scrolling during its container flight');
        assert.deepEqual(nativeWrites, []);

        cancelActiveScroll();
        assert.deepEqual(await cancelled, { status: 'interrupted' });
        assert.deepEqual(nativeWrites, [{ top: 130, left: 8, behavior: 'instant' }]);
        assert.equal(clock.frameCount, 0);

        const detached = scrollTo(element);
        clock.advance(10);
        assert.equal(started.length, 2);
        target.isConnected = false;
        clock.advance(1);
        assert.equal(clock.frameCount, 0);
        assert.deepEqual(await detached, { status: 'interrupted' });
    } finally {
        cancelActiveScroll();
    }
});
