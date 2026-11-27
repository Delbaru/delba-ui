import test from 'node:test';
import assert from 'node:assert/strict';
import { asyncSourceState, isAsyncEmpty } from '../../../src/core/Async/State';
import { syncAsyncPhase, completeAsyncPhase } from '../../../src/core/Async/Phase';

test('currentData never falls back to a previous query argument', () => {
    const state = asyncSourceState({ data: ['old'], currentData: undefined, isLoading: false });
    assert.equal(state.data, undefined);
    assert.equal(state.pending, true);
});

test('background refresh retains confirmed data and network failures retain current data only', () => {
    assert.equal(asyncSourceState({ data: ['current'], loading: true }).pending, false);
    assert.equal(asyncSourceState({ data: ['current'], error: { status: 0 } }).keepCurrent, true);
    assert.equal(asyncSourceState({ data: ['current'], error: { status: 403 } }).keepCurrent, false);
    assert.equal(asyncSourceState({ data: ['old'], currentData: undefined, error: { status: 0 } }).keepCurrent, false);
});

test('empty distinguishes lists from valid false and zero', () => {
    assert.equal(isAsyncEmpty({ items: [] }), true);
    assert.equal(isAsyncEmpty([]), true);
    assert.equal(isAsyncEmpty(false), false);
    assert.equal(isAsyncEmpty(0), false);
    assert.equal(isAsyncEmpty({ items: null }), false);
});

test('loading phase reverses and reduced motion releases immediately', () => {
    assert.equal(syncAsyncPhase('idle', true, false), 'waiting');
    assert.equal(syncAsyncPhase('waiting', false, false), 'idle');
    assert.equal(completeAsyncPhase('waiting'), 'visible');
    assert.equal(syncAsyncPhase('visible', false, false), 'leaving');
    assert.equal(syncAsyncPhase('leaving', true, false), 'visible');
    assert.equal(completeAsyncPhase('leaving'), 'idle');
    assert.equal(syncAsyncPhase('leaving', false, true), 'idle');
});

test('explicit empty is a completed result, but never falls back to stale data', () => {
    const empty = asyncSourceState({ data: ['previous'], currentData: undefined, empty: true });
    assert.equal(empty.data, undefined);
    assert.equal(empty.pending, false);
    assert.equal(empty.empty, true);
    assert.equal(asyncSourceState({ currentData: undefined, empty: true, loading: true }).pending, true);
});


test('falsey non-null errors are completed failures rather than perpetual loading', () => {
    for (const error of ['', 0, false]) {
        const state = asyncSourceState({ error });
        assert.equal(state.error, error);
        assert.equal(state.hasError, true);
        assert.equal(state.pending, false);
        assert.equal(state.empty, true);
    }
});

test('only null and undefined mean no error; object errors preserve identity', () => {
    for (const error of [null, undefined]) {
        const state = asyncSourceState({ data: ['current'], error });
        assert.equal(state.hasError, false);
        assert.equal(state.error, error);
    }
    const error = { status: 0, detail: 'offline' };
    const state = asyncSourceState({ data: ['current'], error });
    assert.equal(state.error, error);
    assert.equal(state.hasError, true);
    assert.equal(state.keepCurrent, true);
});
