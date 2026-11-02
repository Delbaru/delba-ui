import assert from 'node:assert/strict';
import { test } from 'node:test';

import { imageSizes } from '../../core/base/scale';
import { SCALE } from '../../core/scale';
import { imageSourceSizes, sourceDimensions } from './source-sizing';

test('cover sizes preserve enough source pixels when a known wide bitmap is cropped', () => {
  const sizes = imageSourceSizes({
    width: [160, 160, 160],
    height: [160, 160, 160],
    aspectRatio: ['1/1', '1/1', '1/1'],
    objectFit: ['cover', 'cover', 'cover'],
    source: { src: '/wide.webp', width: 1600, height: 800 },
    scale: SCALE,
  });

  assert.equal(sizes, imageSizes({ desktop: 320, mobile: 320, tablet: 320 }, SCALE));
});

test('cover and contain do not oversample a narrow bitmap or unknown source dimensions', () => {
  const base = {
    width: [160, 160, 160] as [number, number, number],
    height: [160, 160, 160] as [number, number, number],
    aspectRatio: ['1/1', '1/1', '1/1'] as [string, string, string],
    scale: SCALE,
  };
  const expected = imageSizes({ desktop: 160, mobile: 160, tablet: 160 }, SCALE);

  assert.equal(
    imageSourceSizes({
      ...base,
      objectFit: 'cover',
      source: { src: '/tall.webp', width: 800, height: 1600 },
    }),
    expected,
  );
  assert.equal(
    imageSourceSizes({
      ...base,
      objectFit: 'contain',
      source: { src: '/wide.webp', width: 1600, height: 800 },
    }),
    expected,
  );
  assert.equal(
    imageSourceSizes({ ...base, objectFit: 'cover', source: '/unknown.webp' }),
    expected,
  );
});

test('percent width and height do not imply a frame aspect ratio', () => {
  const percent = ['100%', '100%', '100%'] as [string, string, string];
  const sizes = imageSourceSizes({
    width: percent,
    height: percent,
    objectFit: 'cover',
    source: { src: '/wide.webp', width: 1600, height: 800 },
    scale: SCALE,
  });

  assert.equal(sizes, imageSizes({ desktop: '100%', mobile: '100%', tablet: '100%' }, SCALE));
});

test('source dimensions accept Next static image data and reject incomplete metadata', () => {
  assert.deepEqual(sourceDimensions({ src: '/photo.webp', width: 640, height: 480 }), {
    width: 640,
    height: 480,
  });
  assert.deepEqual(sourceDimensions({ default: { src: '/photo.webp', width: 640, height: 480 } }), {
    width: 640,
    height: 480,
  });
  assert.equal(sourceDimensions({ src: '/photo.webp', width: 640 }), null);
  assert.equal(sourceDimensions('/photo.webp'), null);
});
