import assert from 'node:assert/strict';
import { test } from 'node:test';
import { historyScrollTop } from '../../../src/core/Scroll/History';

test('prepend preserves a partially visible item', () => {
    assert.equal(historyScrollTop(200, -20, 280, 1200, 400), 500);
});

test('native scroll anchoring is not applied twice', () => {
    assert.equal(historyScrollTop(500, -20, -20, 1200, 400), 500);
});

test('restoration stays within scroll bounds', () => {
    assert.equal(historyScrollTop(30, 0, -100, 500, 400), 0);
    assert.equal(historyScrollTop(30, 0, 200, 500, 400), 100);
    assert.equal(historyScrollTop(30, 0, 200, 100, 400), 0);
});
