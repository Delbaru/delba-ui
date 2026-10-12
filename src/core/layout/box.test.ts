import assert from 'node:assert/strict';
import test from 'node:test';

import { boxLayout, splitBoxLayout } from './box';
import { createLayoutClasses } from './layout-classes';

const c = createLayoutClasses(
    { height_56: 'Field__height_56', d_height_56: 'Field__d_height_56', m_height_56: 'Field__m_height_56', t_height_56: 'Field__t_height_56', variant_primary: 'Field__variant_primary' },
    { local: { h: 'height' } }
);

test('splitBoxLayout: пропсы коробки отделяются, остальное уходит на узел', () => {
    const { box, rest } = splitBoxLayout({ p: 8, bg: 'var(--white-100)', grow: 1, id: 'card', 'aria-label': 'Карточка' });
    assert.deepEqual(box, { p: 8, bg: 'var(--white-100)', grow: 1 });
    assert.deepEqual(rest, { id: 'card', 'aria-label': 'Карточка' });
});

test('boxLayout: пустая коробка не даёт классов', () => {
    assert.deepEqual(boxLayout(c, {}), []);
});

test('boxLayout: responsive положение, фон и скрытие не попадают на DOM', () => {
    const { box, rest } = splitBoxLayout({
        position: ['fixed', 'absolute', 'relative'],
        top: [16, 'auto', null],
        bottom: [null, 0, 0],
        left: ['50%', '50%', '50%'],
        right: [null, null, 8],
        bg: ['var(--paper)', 'var(--background)', 'var(--paper)'],
        hide: [true, false, null],
        id: 'responsive-box',
    });
    assert.deepEqual(rest, { id: 'responsive-box' });
    const classes = boxLayout(c, box);
    assert.ok(classes.includes('position_fixed') && classes.includes('m_position_absolute') && classes.includes('t_position_relative'));
    assert.ok(classes.includes('d_top_16') && classes.includes('m_top_auto'));
    assert.ok(classes.includes('n_bottom_0') && classes.includes('left_50%') && classes.includes('t_right_8'));
    assert.ok(classes.includes('bg_--paper') && classes.includes('m_bg_--background'));
    assert.ok(classes.includes('d_hide_true'));
    assert.ok(!classes.includes('hide_true'), 'false/null не скрывают другие полосы ширины');
    assert.deepEqual(boxLayout(c, { hide: [false, false, false] }), []);
});

test('boxLayout: любое значение — классом утилиты, инлайна нет', () => {
    assert.deepEqual(boxLayout(c, { bg: 'var(--white-100)', grow: [1, 0, null], mt: -8, aspectRatio: '16 / 9' }), [
        'mt_-8',
        'bg_--white-100',
        'ratio_16/9',
        'd_grow_1',
        'm_grow_0',
    ]);
});

test('boxLayout: borderTLR — запасное имя, tlr важнее', () => {
    assert.deepEqual(boxLayout(c, { borderTLR: 12 }), ['tlr_12']);
    assert.deepEqual(boxLayout(c, { tlr: 8, borderTLR: 12 }), ['tlr_8']);
});

test('createLayoutClasses: число локального пропа — из модуля, строка — утилитой', () => {
    assert.deepEqual(c.value('h', 56), ['Field__height_56']);
    assert.deepEqual(c.value('h', [56]), ['Field__d_height_56', 'Field__m_height_56', 'Field__t_height_56']);
    assert.deepEqual(c.value('h', '100%'), ['h_100%']);
    assert.deepEqual(c.value('h', 46.5), ['h_46.5'], 'дробному числу класса модуля не бывает — утилита');
    assert.deepEqual(c.value('variant', 'primary'), ['Field__variant_primary']);
    assert.deepEqual(c.value('variant', 'missing'), []);
});
