import assert from 'node:assert/strict';
import test from 'node:test';
import { cubicBezier, easingPresetName, motionEasing, resolveEasingPreset } from './easing';

test('CSS and JS easing presets share endpoints and serializable control points', () => {
    for (const preset of Object.values(motionEasing)) {
        assert.equal(preset(0), 0);
        assert.equal(preset(1), 1);
        assert.ok(preset.css.length > 0);
        const serialized = easingPresetName(preset);
        assert.ok(serialized);
        assert.equal(resolveEasingPreset(serialized)(0.37), preset(0.37));
    }
    const custom = cubicBezier(0.22, 0.61, 0.36, 1);
    assert.deepEqual(easingPresetName(custom), [0.22, 0.61, 0.36, 1]);
    assert.ok(Math.abs(custom(0.37) - motionEasing.smooth(0.37)) < 1e-8);
    assert.equal(custom.css, 'cubic-bezier(0.22, 0.61, 0.36, 1)');
    const otherModuleInstance = Object.assign(
        (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
        { key: 'easeInOutCubic', css: motionEasing.easeInOutCubic.css },
    );
    assert.equal(easingPresetName(otherModuleInstance), 'easeInOutCubic');
    assert.throws(() => cubicBezier(-1, 0, 1, 1));
});
