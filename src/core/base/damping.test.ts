import assert from 'node:assert/strict';
import test from 'node:test';
import { frameResponse, timeResponse } from './damping';

test('coefficient and time-constant damping preserve elapsed-time response across refresh rates', () => {
    const remaining = (hz: number, response: (elapsedMs: number) => number) => {
        let value = 1;
        for (let frame = 0; frame < hz; frame++) value *= 1 - response(1000 / hz);
        return value;
    };
    for (const response of [
        (ms: number) => frameResponse(0.14, ms),
        (ms: number) => timeResponse(0.7, ms),
    ]) {
        assert.ok(Math.abs(remaining(60, response) - remaining(144, response)) < 1e-12);
        assert.equal(response(0), 0);
    }
    assert.ok(Math.abs(remaining(60, (ms) => timeResponse(0.7, ms)) - Math.exp(-1 / 0.7)) < 1e-12);
    assert.equal(timeResponse(0, 16), 1 - Math.exp(-16));
});
