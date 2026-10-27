import assert from 'node:assert/strict';
import test from 'node:test';

import { hasIconSource, parseAspectRatio, parseRemoteSvg, parseSvg, resolveIconSource } from './svg';

test('parseSvg: viewBox и заливка корня читаются, безопасный цвет остаётся', () => {
    const parsed = parseSvg('<svg viewBox="0 0 24 24" fill="#111"><path fill="#fff" d="M0 0"/></svg>');
    assert.equal(parsed.viewBox, '0 0 24 24');
    assert.equal(parsed.rootFill, '#111');
    assert.match(parsed.content, /fill="#fff"/);
});

test('parseSvg: краска вне белого списка выкидывается', () => {
    const { content } = parseSvg('<svg><path fill="url(javascript:alert(1))" stroke="expression(alert(1))" d="M0 0"/></svg>');
    assert.doesNotMatch(content, /javascript|expression/);
});

test('parseSvg с перекраской: цвет уходит в переменную, исходный — запасным', () => {
    const { content } = parseSvg('<svg><path fill="#fff" stroke="none" stroke-width="2" d="M0 0"/></svg>', true);
    assert.match(content, /fill="var\(--icon-fill, #fff\)"/);
    assert.match(content, /stroke="none"/);
    assert.match(content, /stroke-width="var\(--icon-stroke-width, 2\)"/);
});

test('parseSvg: не SVG — ошибка, а не пустая иконка', () => {
    assert.throws(() => parseSvg('<div></div>'), /Invalid SVG/);
});

test('fetched SVG sanitizes parsed URL attributes and active SVG nodes', async () => {
    for (const href of ['href=javascript:alert(1)', 'href="jav&#x61;script:alert(1)"', 'xlink:href="java&#9;script:alert(1)"']) {
        const parsed = await parseRemoteSvg(`<svg><a ${href}><text>Open</text></a><animate attributeName="href" values="javascript:alert(1)"/><foreignObject><div>unsafe</div></foreignObject></svg>`);
        assert.doesNotMatch(parsed.content, /href=|javascript|animate|foreignObject/i);
        assert.match(parsed.content, /Open/);
    }
});

test('fetched SVG retains masks, gradients and local fragment references', async () => {
    const parsed = await parseRemoteSvg('<svg viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0" stop-color="#fff"/></linearGradient><mask id="mask"><rect width="24" height="24" fill="#fff"/></mask></defs><path fill="url(#paint)" mask="url(#mask)" d="M0 0"/></svg>');
    assert.equal(parsed.viewBox, '0 0 24 24');
    assert.match(parsed.content, /linearGradient/);
    assert.match(parsed.content, /fill="url\(#paint\)"/);
    assert.match(parsed.content, /mask="url\(#mask\)"/);
});

test('resolveIconSource: имя, относительный путь, абсолютный адрес, объект', () => {
    assert.deepEqual(resolveIconSource('ui/check'), { url: '/icons/ui/check.svg' });
    assert.deepEqual(resolveIconSource('./ui/arrows/arrow_gold.svg'), { url: '/icons/ui/arrows/arrow_gold.svg' });
    assert.deepEqual(resolveIconSource('/icons/ui/x.svg'), { url: '/icons/ui/x.svg' });
    assert.deepEqual(resolveIconSource({ name: 'ui/eye' }), { component: undefined, url: '/icons/ui/eye.svg' });
    assert.equal(hasIconSource(resolveIconSource(undefined)), false);
});

test('parseAspectRatio: пропорция из viewBox, вырожденный — undefined', () => {
    assert.equal(parseAspectRatio('0 0 24 12'), '24 / 12');
    assert.equal(parseAspectRatio('0 0 0 12'), undefined);
    assert.equal(parseAspectRatio(undefined), undefined);
});
