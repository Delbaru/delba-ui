import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SCALE, imageSizes, resolveScale, scaleCss } from './scale';

test('imageSizes: rpx — доля окна по базе полосы, на десктопе шире потолка — px', () => {
  assert.equal(
    imageSizes({ desktop: 624, mobile: 280, tablet: 704 }, DEFAULT_SCALE),
    '(max-width: 767px) 87.5vw, (max-width: 1023px) 91.67vw, (min-width: 2560px) 832px, 32.5vw',
  );
});

test('imageSizes: проценты — процентами окна, без потолка', () => {
  assert.equal(imageSizes({ desktop: '50%', mobile: '100%', tablet: 384 }, DEFAULT_SCALE), '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 50vw');
});

test('imageSizes: базы берутся из масштаба проекта', () => {
  const scale = resolveScale({ desktop: 1440 });
  assert.equal(imageSizes({ desktop: 720, mobile: 160, tablet: 384 }, scale), '(max-width: 767px) 50vw, (max-width: 1023px) 50vw, (min-width: 2560px) 1280px, 50vw');
});

test('imageSizes: иные единицы — ошибка', () => {
  assert.throws(() => imageSizes({ desktop: '10rem', mobile: 1, tablet: 1 }, DEFAULT_SCALE), /number\(rpx\) or percent/);
});

test('resolveScale: частичное переопределение и проверка чисел', () => {
  assert.deepEqual(resolveScale({ mobile: 390 }), { ...DEFAULT_SCALE, mobile: 390 });
  assert.throws(() => resolveScale({ max: 0 }), /scale\.max/);
});

test('scaleCss: база и потолок по брейкпоинтам кита', () => {
  const css = scaleCss(resolveScale({ desktop: 1440 }));
  assert.match(css, /@media \(max-width: 767px\) \{\n  :root \{\n    --base-width: 320;/);
  assert.match(css, /and \(max-width: 1023px\) \{\n  :root \{\n    --base-width: 768;/);
  assert.match(css, /--base-width: 1440;\n    --base-width-max: 2560;\n    --base-width-max-px: 2560px;/);
});
