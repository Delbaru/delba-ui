import assert from 'node:assert/strict';
import test from 'node:test';
import { bindDurationWheel, DurationSession } from '../../../src/core/Duration/DurationSession';
import { clampDuration, durationMaximum, durationParts } from '../../../src/core/Duration/math';

const plain = { shiftKey: false, ctrlKey: false, metaKey: false };

test('duration arithmetic normalizes nonfinite, fractional and bounded values', () => {
    assert.equal(clampDuration(-12), 0);
    assert.equal(clampDuration(Number.NaN), 0);
    assert.equal(clampDuration(Number.POSITIVE_INFINITY), 0);
    assert.equal(clampDuration(81.6, 80), 80);
    assert.equal(durationMaximum(-5), 0);
    assert.equal(durationMaximum(Number.NaN), 1440);
    assert.deepEqual(durationParts(125.6), { hours: 2, minutes: 6 });
});

test('blank and overflow drafts commit once, cancel restores controlled value', () => {
    const changes: number[] = [];
    const session = new DurationSession({ value: 65, onChange: (value) => changes.push(value) });
    session.change('hours', '');
    session.change('minutes', '120');
    assert.deepEqual(session.getSnapshot(), { hours: '', minutes: '120' });
    session.commit();
    session.commit();
    assert.deepEqual(changes, [120]);
    assert.deepEqual(session.getSnapshot(), { hours: '2', minutes: '00' });
    session.change('minutes', 'NaN');
    assert.equal(session.getSnapshot().minutes, '00');
    session.cancel();
    session.commit();
    assert.deepEqual(changes, [120]);
    assert.deepEqual(session.getSnapshot(), { hours: '1', minutes: '05' });
});

test('keyboard Enter and blur deduplicate; modifiers and Escape preserve editor semantics', () => {
    const changes: number[] = [];
    const session = new DurationSession({
        value: 60,
        onChange: (value) => changes.push(value),
        maxMinutes: 150,
    });
    const key = (name: string, modifiers = plain) => {
        let prevented = false;
        session.key(60, {
            ...modifiers,
            key: name,
            defaultPrevented: false,
            preventDefault() {
                prevented = true;
            },
        });
        assert.equal(prevented, true);
    };
    session.change('minutes', '15');
    key('Enter');
    session.commit();
    key('ArrowUp', { ...plain, ctrlKey: true });
    key('ArrowUp', { ...plain, metaKey: true });
    key('ArrowUp', { ...plain, ctrlKey: true, shiftKey: true });
    key('ArrowUp');
    assert.deepEqual(changes, [75, 85, 95, 125, 150]);
    key('Escape');
    assert.deepEqual(session.getSnapshot(), { hours: '1', minutes: '00' });
});

test('latest callbacks, scope switches and disabled changes do not preserve stale drafts', () => {
    const oldChanges: number[] = [];
    const changes: number[] = [];
    const options = { value: 60, scope: 'a', onChange: (value: number) => oldChanges.push(value) };
    const session = new DurationSession(options);
    session.change('hours', '9');
    session.sync({ ...options, scope: 'b', onChange: (value) => changes.push(value) });
    assert.deepEqual(session.getSnapshot(), { hours: '1', minutes: '00' });
    session.step(1, 1, plain);
    assert.deepEqual(changes, [61]);
    assert.deepEqual(oldChanges, []);
    session.sync({ ...options, value: 61, disabled: true });
    session.change('hours', '9');
    session.step(60, 1, plain);
    session.commit();
    assert.deepEqual(session.getSnapshot(), { hours: '1', minutes: '01' });
    assert.deepEqual(oldChanges, []);
});

test('external value and maximum updates reset drafts, while composing keys are ignored', () => {
    const changes: number[] = [];
    const options = {
        value: 65,
        maxMinutes: 100,
        onChange: (value: number) => changes.push(value),
    };
    const session = new DurationSession(options);
    session.change('minutes', '');
    session.sync({ ...options, value: 75 });
    assert.deepEqual(session.getSnapshot(), { hours: '1', minutes: '15' });
    session.change('hours', '9');
    session.sync({ ...options, value: 75, maxMinutes: 50 });
    assert.deepEqual(session.getSnapshot(), { hours: '0', minutes: '50' });
    session.step(60, -1, plain);
    assert.deepEqual(changes, [0]);
    session.key(1, {
        ...plain,
        key: 'ArrowUp',
        defaultPrevented: false,
        nativeEvent: { isComposing: true },
        preventDefault() {
            assert.fail('composing keys must remain native');
        },
    });
    assert.deepEqual(changes, [0]);
});

test('wheel binding uses a nonpassive listener with exact cleanup and owner-document elements', () => {
    const changes: number[] = [];
    const session = new DurationSession({ value: 60, onChange: (value) => changes.push(value) });
    class OwnerElement {
        closest() {
            return this;
        }
        hasAttribute() {
            return false;
        }
        getAttribute() {
            return '1';
        }
    }
    const input = new OwnerElement();
    let listener: ((event: WheelEvent) => void) | undefined;
    const root = {
        ownerDocument: { defaultView: { Element: OwnerElement } },
        contains: (node: unknown) => node === input,
        addEventListener(
            name: string,
            callback: (event: WheelEvent) => void,
            options: { passive: boolean },
        ) {
            assert.equal(name, 'wheel');
            assert.equal(options.passive, false);
            listener = callback;
        },
        removeEventListener(name: string, callback: (event: WheelEvent) => void) {
            assert.equal(name, 'wheel');
            assert.equal(callback, listener);
            listener = undefined;
        },
    } as unknown as HTMLElement;
    const cleanup = bindDurationWheel(root, session);
    let prevented = false;
    let stopped = false;
    const event = {
        ...plain,
        target: input,
        defaultPrevented: false,
        deltaY: -1,
        preventDefault() {
            prevented = true;
        },
        stopPropagation() {
            stopped = true;
        },
    } as unknown as WheelEvent;
    listener?.(event);
    assert.deepEqual(changes, [61]);
    assert.equal(prevented, true);
    assert.equal(stopped, true);
    session.sync({ value: 61, disabled: true, onChange: (value) => changes.push(value) });
    listener?.(event);
    assert.deepEqual(changes, [61]);
    cleanup();
    assert.equal(listener, undefined);
});
