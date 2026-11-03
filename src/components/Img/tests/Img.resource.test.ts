import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { imageAddress, prepareImage } from '../Img.resource';

test('static require sources retain the real identity and private API policy', () => {
  const source = { default: { src: '/api/private/photo.webp', width: 800, height: 400 } };
  const resource = prepareImage({ src: source, alt: 'Imported photo' }, { w: [160, 160, 160] }, {});
  assert.equal(imageAddress(source), source.default.src);
  assert.equal(resource.identity, source.default.src);
  assert.equal(resource.image.unoptimized, true);
  assert.equal(prepareImage({ src: source, alt: '' }, { w: [160, 160, 160] }, { unoptimized: false }).image.unoptimized, false);
});

test('one source preparation keeps per-band policy, source order and duplicate omission', () => {
  const resource = prepareImage({
    src: ['/desktop.webp', '/api/private/mobile.webp', '/tablet.webp'], alt: 'Photo', priority: true,
  }, { w: [160, 160, 160] }, {});
  assert.deepEqual(resource.sources.map(source => source.media), ['mobile', 'tablet']);
  assert.equal(resource.sources[0]?.srcSet, '/api/private/mobile.webp');
  assert.match(resource.sources[1]?.srcSet ?? '', /\/_next\/image/);
  assert.equal(resource.image.loading, 'eager');
  assert.equal(resource.image.fetchPriority, 'high');
  assert.equal(prepareImage({ src: ['/same.webp', '/same.webp', null], alt: '' }, { w: [160, 160, 160] }, {}).picture, null);
});

test('all explicit/null source combinations preserve the narrow-first picture cascade', () => {
  const { Img } = createRequire(import.meta.url)('../Img.tsx') as typeof import('../Img');
  const cases = [
    { src: ['/a.webp', '/a.webp', '/b.webp'], bands: ['mobile', 'tablet'], mobile: '/a.webp' },
    { src: ['/a.webp', null, '/b.webp'], bands: ['tablet'], mobile: '/b.webp' },
    { src: ['/a.webp', '/b.webp', '/a.webp'], bands: ['mobile'], mobile: '/b.webp' },
    { src: ['/a.webp', '/a.webp', null], bands: [], mobile: '/a.webp' },
    { src: ['/a.webp', null, '/a.webp'], bands: [], mobile: '/a.webp' },
    { src: ['/a.webp', '/b.webp', '/c.webp'], bands: ['mobile', 'tablet'], mobile: '/b.webp' },
  ] satisfies { src: [string, string | null, string | null]; bands: string[]; mobile: string }[];
  const width: [number, number, number] = [160, 160, 160];
  for (const item of cases) {
    const props = { src: item.src, alt: 'Cascade', unoptimized: true, w: width };
    const resource = prepareImage(props, { w: props.w }, { unoptimized: true });
    assert.deepEqual(resource.sources.map(source => source.media), item.bands);
    assert.equal(resource.sources[0]?.srcSet ?? resource.identity, item.mobile);
    const html = renderToStaticMarkup(createElement(Img, props));
    const rendered = [...html.matchAll(/<source media="([^"]+)" srcSet="([^"]+)"/g)];
    assert.deepEqual(rendered.map(match => match[2]), resource.sources.map(source => source.srcSet));
    assert.equal(rendered[0]?.[2] ?? resource.identity, item.mobile);
  }
});

test('single unoptimized srcset escapes URL whitespace without changing Next candidate descriptors', () => {
  const { Img } = createRequire(import.meta.url)('../Img.tsx') as typeof import('../Img');
  const svg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"%3E%3C/svg%3E';
  const props = { src: ['/desktop.webp', svg, null], alt: 'SVG art direction' } satisfies import('../Img.types').ImgProps;
  const resource = prepareImage(props, { w: [160, 160, 160] }, {});
  assert.equal(resource.sources[0]?.srcSet, svg.replace(/ /g, '%20'));
  assert.match(renderToStaticMarkup(createElement(Img, { ...props, w: [160, 160, 160] })), /srcSet="data:image\/svg\+xml,%3Csvg%20xmlns=/);
  const optimized = prepareImage({ src: ['/desktop.webp', '/mobile.webp', null], alt: '' }, { w: [160, 160, 160] }, {});
  assert.match(optimized.sources[0]?.srcSet ?? '', /\d+w, .*\d+w/);
  assert.equal(optimized.sources[0]?.srcSet.includes('%20'), false);
});

test('real Img routes root markers and native image attributes without nested lightbox links', () => {
  const { Img } = createRequire(import.meta.url)('../Img.tsx') as typeof import('../Img');
  const html = renderToStaticMarkup(createElement(Img, {
    src: { default: { src: '/api/private/photo.webp', width: 800, height: 400 } },
    w: [160, 160, 160], alt: 'Photo', fancybox: 'gallery', href: '/catalog', title: 'Image title',
    ...{ 'data-hide-scrollbar': 'true' },
  }));
  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  assert.equal(html.includes('data-fancybox='), false);
  assert.match(html, /<a[^>]*data-hide-scrollbar="true"/);
  assert.match(html, /<img[^>]*title="Image title"/);
  assert.equal(/<a[^>]*title=/.test(html), false);
  const lightbox = renderToStaticMarkup(createElement(Img, {
    src: { default: { src: '/api/private/photo.webp', width: 800, height: 400 } },
    w: [160, 160, 160], alt: '', fancybox: 'gallery', blur: true,
  }));
  assert.match(lightbox, /href="\/api\/private\/photo.webp"/);
  assert.match(lightbox, /aria-label="Изображение"/);
  assert.match(lightbox, /(?:class="| )ui-img-blur(?: |")/);
  assert.doesNotMatch(lightbox, /(?:class="| )ImgBlur(?: |")/);
  assert.match(lightbox, /aria-hidden="true"/);
});
