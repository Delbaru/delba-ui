import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hoverMotionStyle, hoverTransformCss, isHoverTransformAnimate, resolveHoverTransform } from './hover-motion';

test('hover uses signed shared distances and timing tokens without DOM reads', () => {
    assert.equal(hoverTransformCss({ x: 4, y: -2, scale: 1.025, rotate: 45 }),
        'translate(calc(var(--rpx) * 4), calc(-1 * calc(var(--rpx) * 2))) rotate(45deg) scale(1.025)');
    assert.equal(hoverTransformCss({ x: '-50%', y: 'cardOffset' }),
        'translate(calc(-1 * 50%), var(--t-m-distance-card-offset, calc(var(--rpx) * 32))) rotate(0deg) scale(1)');
    const style = hoverMotionStyle({ effect: 'transform', scale: 1, from: { scale: 1 / 1.1 }, duration: 'verySlow', easing: 'ease-out' });
    assert.equal(style['--hover-motion-duration' as keyof typeof style], 'var(--t-d-very-slow)');
    assert.equal(style['--hover-motion-easing' as keyof typeof style], 'var(--t-t-f-ease-out)');
    assert.match(String(style['--hover-motion-from' as keyof typeof style]), /scale\(0\.9090909090909091\)/);
});

test('guards preserve button rise, icon changes and legacy content animation', () => {
    const transform = { when: 'hover', effect: 'transform', x: 4 };
    assert.equal(isHoverTransformAnimate(transform), true);
    assert.equal(resolveHoverTransform(transform), transform);
    assert.equal(resolveHoverTransform({ when: 'load', effect: 'up', hover: transform }), transform);
    for (const other of [{ when: 'hover', effect: 'rise' }, { when: 'change', effect: 'swap' }, 'swap', ['fadeIn'], null, false]) {
        assert.equal(isHoverTransformAnimate(other), false);
        assert.equal(resolveHoverTransform(other), undefined);
    }
    assert.equal(resolveHoverTransform({ when: 'load', effect: 'up', hover: false }), undefined);
});

test('invalid scalar input falls back to neutral values and safe tokens', () => {
    assert.equal(hoverTransformCss({ scale: -1, rotate: Infinity, x: NaN, y: 'url(bad)' }),
        'translate(0px, 0px) rotate(0deg) scale(1)');
    const style = hoverMotionStyle({ effect: 'transform', duration: -1, easing: 'ease);color:red' });
    assert.equal(style['--hover-motion-duration' as keyof typeof style], '0s');
    assert.equal(style['--hover-motion-easing' as keyof typeof style], 'var(--t-t-f-cubic-bezier)');
});
