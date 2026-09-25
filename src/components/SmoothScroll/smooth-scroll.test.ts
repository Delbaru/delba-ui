import assert from 'node:assert/strict';
import test from 'node:test';

import {
    anchorTop,
    autoDurationMs,
    canScrollBy,
    clampScroll,
    easeOutExpo,
    hashTarget,
    isManualDrift,
    lerpStep,
    offsetCss,
    tweenPosition,
    wheelDeltaPx,
} from './smooth-scroll';

test('wheelDeltaPx приводит строки и страницы к пикселям', () => {
    assert.equal(wheelDeltaPx(100, 0, 800), 100);
    assert.equal(wheelDeltaPx(3, 1, 800), 48);
    assert.equal(wheelDeltaPx(-1, 2, 800), -800);
});

test('clampScroll держит позицию в [0, max], отрицательный max — ноль', () => {
    assert.equal(clampScroll(-10, 500), 0);
    assert.equal(clampScroll(700, 500), 500);
    assert.equal(clampScroll(200, 500), 200);
    assert.equal(clampScroll(200, -50), 0);
});

test('lerpStep: доля пути от времени кадра, у цели — защёлка', () => {
    assert.ok(Math.abs(lerpStep(0, 100, 0.1, 1000 / 60) - 10) < 1e-9);
    // Два кадра по 60 Гц = один кадр 30 Гц: скорость не зависит от частоты экрана.
    const twice = lerpStep(lerpStep(0, 100, 0.1, 1000 / 60), 100, 0.1, 1000 / 60);
    assert.ok(Math.abs(lerpStep(0, 100, 0.1, 2000 / 60) - twice) < 1e-9);
    assert.equal(lerpStep(99.7, 100, 0.1, 16), 100);
    assert.equal(lerpStep(0, 100, 1, 16), 100);
    assert.equal(lerpStep(50, 50, 0.1, 16), 50);
    assert.ok(lerpStep(0, 100, 0, 1000 / 60) > 0, 'lerp 0 не замораживает ход');
});

test('tweenPosition идёт по функции хода и приходит ровно в цель', () => {
    const linear = (t: number) => t;
    assert.deepEqual(tweenPosition(0, 200, 500, 1000, linear), { y: 100, done: false });
    assert.deepEqual(tweenPosition(0, 200, 1000, 1000, linear), { y: 200, done: true });
    assert.deepEqual(tweenPosition(100, 0, 0, 0, linear), { y: 0, done: true });
    assert.equal(easeOutExpo(0), 0);
    assert.equal(easeOutExpo(1), 1);
});

test('autoDurationMs растёт с расстоянием в пределах 400–1200 мс', () => {
    assert.equal(autoDurationMs(0, 800), 400);
    assert.equal(autoDurationMs(-800, 800), 650);
    assert.ok(autoDurationMs(3200, 800) > autoDurationMs(800, 800));
    assert.equal(autoDurationMs(1e7, 800), 1200);
});

test('offsetCss заворачивает имя переменной в var(), остальное не трогает', () => {
    assert.equal(offsetCss('--header-h'), 'var(--header-h)');
    assert.equal(offsetCss(' --header-h '), 'var(--header-h)');
    assert.equal(offsetCss('calc(var(--header-h) + 24px)'), 'calc(var(--header-h) + 24px)');
    assert.equal(offsetCss('80px'), '80px');
});

test('anchorTop: offset под шапку, scroll-margin-top цели его заменяет', () => {
    assert.equal(anchorTop(300, 1000, 80, 0), 1220);
    assert.equal(anchorTop(300, 1000, 80, 120), 1180);
    assert.equal(anchorTop(-200, 1000, 0, 0), 800);
});

test('canScrollBy: контейнер ещё может ехать в сторону дельты', () => {
    const box = { scrollTop: 0, scrollHeight: 500, clientHeight: 200 };
    assert.equal(canScrollBy(box, 10), true);
    assert.equal(canScrollBy(box, -10), false);
    assert.equal(canScrollBy({ ...box, scrollTop: 300 }, 10), false);
    assert.equal(canScrollBy({ ...box, scrollTop: 300 }, -10), true);
    assert.equal(canScrollBy(box, 0), false);
});

test('isManualDrift прощает округление до пикселя', () => {
    assert.equal(isManualDrift(100, 100.6), false);
    assert.equal(isManualDrift(100, 99), false);
    assert.equal(isManualDrift(100, 120), true);
});

test('hashTarget: только якорь этой же страницы', () => {
    const home = 'https://site.ru/';
    const page = 'https://site.ru/about?x=1';
    assert.equal(hashTarget('#team', home), 'team');
    assert.equal(hashTarget('/#team', home), 'team');
    assert.equal(hashTarget('https://site.ru/#team', home), 'team');
    assert.equal(hashTarget('#team', page), 'team');
    assert.equal(hashTarget('/about?x=1#team', page), 'team');
    assert.equal(hashTarget('/about/?x=1#team', page), 'team', 'хвостовой слеш не делает страницу другой');
    assert.equal(hashTarget('/#team', page), null, 'другая страница — роутеру');
    assert.equal(hashTarget('/about#team', page), null, 'другой запрос — другая страница');
    assert.equal(hashTarget('https://other.ru/#team', home), null);
    assert.equal(hashTarget('#', home), null);
    assert.equal(hashTarget('/', home), null);
    assert.equal(hashTarget('#%D0%BA%D0%BB%D1%83%D0%B1', home), 'клуб');
    assert.equal(hashTarget('#%E0%A4%A', home), '%E0%A4%A', 'битая кодировка — как есть');
    assert.equal(hashTarget('http://[bad', home), null);
});
