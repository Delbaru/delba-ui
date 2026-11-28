import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePresetProps } from '../../../src/core/Preset';
import styles from '../../../src/core/Preset/Preset.module.scss';

function variables(props: { style?: unknown }): Record<string, unknown> {
    return props.style as Record<string, unknown>;
}

test('preset defaults retain full native props and ignore undefined overrides', () => {
    const ref = { current: null };
    const onClick = () => undefined;
    const result = resolvePresetProps({
        preset: { h: [32, 32, 32], bg: ['red', 'red', 'red'] },
        h: undefined,
        bg: ['blue', null, 'green'],
        ref,
        onClick,
        'data-items': ['a', 'b'],
        'aria-label': 'Save',
    });
    assert.deepEqual(result.h, [32, 32, 32]);
    assert.deepEqual(result.bg, ['blue', null, 'green']);
    assert.equal(result.ref, ref);
    assert.equal(result.onClick, onClick);
    assert.deepEqual(result['data-items'], ['a', 'b']);
    assert.equal(result['aria-label'], 'Save');
    assert.equal('preset' in result, false);
    assert.equal(variables(result)['--preset-d-base-background'], 'blue');
    assert.equal(variables(result)['--preset-m-base-background'], undefined);
});

test('states merge by name and field while explicit styles have their own final tier', () => {
    const result = resolvePresetProps({
        preset: {
            border: ['1px solid red', '1px solid red', '1px solid red'],
            states: { hover: { bg: ['red', 'red', 'red'], opacity: 0.4 } },
        },
        borderC: ['blue', 'blue', 'blue'],
        states: { hover: { opacity: 0.8 } },
    });
    const style = variables(result);
    assert.equal(style['--preset-d-hover-background'], 'red');
    assert.equal(style['--preset-d-hover-opacity'], '0.8');
    assert.equal(style['--preset-d-explicit-border-color'], 'blue');
    assert.equal(style['--preset-d-explicit_hover-opacity'], '0.8');
    assert.equal('states' in result, false);
});

test('custom state flags resolve visual defaults and retain the existing state contract', () => {
    const result = resolvePresetProps({
        preset: { states: { warning: { bg: ['orange', 'orange', 'orange'], p: [8, 8, 8] } } },
        state: ['warning', 'selected'],
        p: [12, 12, 12],
        disabled: true,
    });
    assert.equal(result.state as unknown, 'warning selected disabled');
    assert.deepEqual(result.p, [12, 12, 12]);
    assert.equal(variables(result)['--preset-d-base-background'], 'orange');
    assert.equal(variables(result)['--preset-d-base-padding'], 'calc(var(--rpx) * 12)');
});

test('native and ARIA state flags are available in SSR output without handlers', () => {
    const result = resolvePresetProps({
        checked: true,
        'aria-expanded': true,
        'aria-invalid': 'grammar',
        'aria-pressed': true,
        states: { checked: { opacity: 0.9 }, disabled: { opacity: 0.3 } },
    });
    assert.equal((result as { state?: string }).state, 'checked open error pressed');
    assert.equal(variables(result)['--preset-d-checked-opacity'], '0.9');
    assert.equal(variables(result)['--preset-d-disabled-opacity'], '0.3');
    assert.equal('onMouseEnter' in result, false);
    assert.equal('onPointerDown' in result, false);
});

test('scalar values and nested responsive space use the shared grid and number formatters', () => {
    const result = resolvePresetProps({
        p: [[4, 12], [0, 8], null],
        columns: [3, 1, 2],
        fontSize: [13, 13, 13],
        borderW: [1, 1, 1],
        opacity: 0.5,
        lineHeight: [1.25, 1.25, 1.25],
    });
    const style = variables(result);
    assert.equal(
        style['--preset-d-base-padding'],
        'calc(var(--rpx) * 4) calc(var(--rpx) * 12) calc(var(--rpx) * 4) calc(var(--rpx) * 12)',
    );
    assert.equal(style['--preset-t-base-padding'], undefined);
    assert.equal(style['--preset-d-base-grid-template-columns'], 'repeat(3, minmax(0, 1fr))');
    assert.equal(style['--preset-d-base-font-size'], 'calc(var(--rpx) * 13)');
    assert.equal(style['--preset-d-base-border-width'], 'calc(var(--rpx) * 1)');
    assert.equal(style['--preset-d-base-line-height'], '1.25');
    assert.equal(style['--preset-d-base-opacity'], '0.5');
    assert.equal('opacity' in result, false);
});

test('arbitrary values use static module classes rather than extracted value classes', () => {
    const result = resolvePresetProps({ bg: ['var(--custom)', 'var(--custom)', 'var(--custom)'] });
    const className = (result as { className?: string }).className;
    assert.ok(className?.split(' ').includes(styles.d_base_background));
    assert.ok(className?.split(' ').includes(styles.Preset));
    assert.equal(className?.includes('bg_--custom'), false);
    assert.equal(variables(result)['--preset-d-base-background'], 'var(--custom)');
});

test('field destination keeps root attributes and puts no internal options on DOM', () => {
    const result = resolvePresetProps(
        { id: 'field', preset: { h: [32, 32, 32] } },
        { target: 'field' },
    );
    assert.equal(result.id, 'field');
    assert.ok((result as { className?: string }).className?.split(' ').includes(styles.Field));
    assert.equal('target' in result, false);
});

test('field variables remain separate when its native root resolves layout props again', () => {
    const field = resolvePresetProps({ gap: [12, 12, 12], font: 'body' }, { target: 'field' });
    const root = resolvePresetProps({ ...field, gap: [8, 4, 8] });
    assert.equal(variables(root)['--preset-field-d-base-gap'], 'calc(var(--rpx) * 12)');
    assert.equal(variables(root)['--preset-d-base-gap'], 'calc(var(--rpx) * 8)');
    assert.equal(variables(root)['--preset-field-d-base-font-size'], 'var(--type-body-font-size)');
    assert.ok(root.className.split(' ').includes(styles.field_d_base_gap));
    assert.ok(root.className.split(' ').includes(styles.d_base_gap));
});

test('runtime preset input cannot introduce behavior or native value defaults', () => {
    const onClick = () => undefined;
    const result = resolvePresetProps({
        preset: { onClick, value: 'hidden', disabled: true, h: [32, 32, 32] },
    });
    assert.equal('onClick' in result, false);
    assert.equal('value' in result, false);
    assert.equal('disabled' in result, false);
    assert.deepEqual((result as { h?: number[] }).h, [32, 32, 32]);
});

test('responsive arrays remain exactly desktop mobile tablet', () => {
    assert.throws(() => resolvePresetProps({ p: [4, 8] }), /desktop, mobile, tablet/);
    assert.throws(() => resolvePresetProps({ p: [4, undefined, 8] }), /null to skip/);
});
