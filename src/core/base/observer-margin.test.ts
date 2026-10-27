import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeObserverMargin } from './observer-margin';

test('explicit four-sided margins preserve negative percentage semantics and legacy strings', () => {
    assert.equal(
        normalizeObserverMargin({ top: '0px', right: '0px', bottom: '-10%', left: '0px' }),
        '0px 0px -10% 0px',
    );
    assert.equal(normalizeObserverMargin('0px 0px -10% 0px'), '0px 0px -10% 0px');
    assert.equal(normalizeObserverMargin('100px'), '100px');
    for (const invalid of [
        { all: '10px' },
        { top: '0px', bottom: '0px' },
        { top: '0px', right: '0px', bottom: '10vh', left: '0px' },
        'var(--x)',
        '0px; color:red',
    ])
        assert.equal(normalizeObserverMargin(invalid), null);
});
