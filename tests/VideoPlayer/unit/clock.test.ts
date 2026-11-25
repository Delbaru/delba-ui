import assert from 'node:assert/strict';
import test from 'node:test';
import { formatClock } from '../../../src/components/VideoPlayer/VideoPlayer.config';

test('short clips keep the time label compact without losing hour-long playback', () => {
    assert.equal(formatClock(16.9), '00:16');
    assert.equal(formatClock(3599), '59:59');
    assert.equal(formatClock(3600), '01:00:00');
    for (const value of [NaN, Infinity, -1]) assert.equal(formatClock(value), '00:00');
});
