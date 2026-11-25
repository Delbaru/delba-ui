import assert from 'node:assert/strict';
import test from 'node:test';

import { axisAt, defineSkin, resolveSkin, skinPad, skinRadius } from '../../../src/skin/index';

const skin = defineSkin({
    axes: { fill: ['none', 'primary-hover'], border: ['none', 'line'], textColor: ['white'] },
    defaults: { textColor: 'white' },
    presets: { primary: { fill: 'primary-hover', border: 'line' }, bare: { border: 'none' } },
});
const styles = { skin: 'S_skin', 'skin-primary': 'S_primary' };

test('resolveSkin: проп инстанса > пресет > defaults, дефис в имени класса — подчёркивание', () => {
    assert.equal(resolveSkin(skin, styles, 'primary').className, 'S_skin sk_fill_primary_hover sk_border_line sk_text_white S_primary');
    assert.equal(resolveSkin(skin, styles, 'primary', { fill: 'none' }).className, 'S_skin sk_fill_none sk_border_line sk_text_white S_primary');
});

test('resolveSkin: шкалы не теряются, а конфиг без scales остаётся допустимым', () => {
    const scaled = defineSkin({
        axes: { fill: ['none', 'primary-hover'] } as const,
        scales: { gap: [4, 8, 16] } as const,
        defaults: { fill: 'none' },
        presets: { compact: { gap: 4 }, regular: { gap: 8 } },
    });
    assert.equal(resolveSkin(scaled, styles, 'compact').axes.gap, 4);
    assert.deepEqual(resolveSkin(scaled, styles, 'regular', { gap: [8, null, 16] }).axes.gap, [8, null, 16]);
    assert.equal(resolveSkin(scaled, styles, 'regular', { gap: 0 }).axes.gap, 0);
    assert.equal(resolveSkin(skin, styles, 'primary').axes.fill, 'primary-hover');
});

test('resolveSkin: border none не печатает класса рамки', () => {
    assert.equal(resolveSkin(skin, styles, 'bare').className, 'S_skin sk_text_white');
});

test('геометрия: скаляр на всех ширинах, null в кортеже — пропуск, сырой pad перекрывает словарь', () => {
    const sizes = { sm: 16, lg: [12, 24] } as const;
    assert.equal(axisAt(['sm', null, 'lg'], 1), undefined);
    assert.deepEqual(skinPad(sizes, 'sm'), [16, 16, 16]);
    assert.deepEqual(skinPad(sizes, ['lg', null, 'sm']), [[12, 24], null, 16]);
    assert.deepEqual(skinPad(sizes, 'sm', 8), [8, 8, 8]);
    assert.deepEqual(skinRadius({ md: 16 }, 'md'), [16, 16, 16]);
    assert.equal(skinRadius({ md: 16 }), undefined);
});

test('skin padding preserves four sides in each breakpoint and distinguishes zero from absence', () => {
    const sizes = { inset: [4, 8, 12, 16], none: 0 } as const;
    const padding = skinPad(sizes, ['inset', null, 'none']);
    assert.deepEqual(padding, [[4, 8, 12, 16], null, 0]);
    assert.deepEqual(skinPad(sizes, 'none', [1, 2, 3, 4]), [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]]);
    assert.equal(skinPad(sizes), undefined);
});
