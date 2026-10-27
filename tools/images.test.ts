import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { getImageProps } from 'next/image';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Img } from '../src/components/Img/Img';
import { imageUnoptimized } from '../src/components/Img/optimization';
import { generateImages, imagesTs, validateImages } from './images';

const publicPrefixes = ['/api/media/file/'];

test('image policy preserves private API defaults and explicit Next overrides', () => {
    assert.equal(imageUnoptimized('/api/private/photo.webp', undefined, []), true);
    assert.equal(imageUnoptimized('/api/media/file/photo.webp', undefined, []), true);
    assert.equal(imageUnoptimized('/photo.webp', undefined, []), undefined);
    assert.equal(imageUnoptimized('https://cms.example/api/media/file/photo.webp', undefined, []), undefined);
    assert.equal(imageUnoptimized({ src: '/api/photo.webp' }, undefined, []), undefined);
    assert.equal(imageUnoptimized('/api/private/photo.webp', false, []), false);
    assert.equal(imageUnoptimized('/api/media/file/photo.webp', true, publicPrefixes), true);
});

test('public API matching respects directory boundaries, version queries and canonical paths', () => {
    assert.equal(imageUnoptimized('/api/media/file/photo.webp?v=2026-10-27', undefined, publicPrefixes), false);
    assert.equal(imageUnoptimized('/api/media/files/photo.webp', undefined, publicPrefixes), true);
    assert.equal(imageUnoptimized('/api/media/file/../private.webp', undefined, publicPrefixes), true);
    assert.equal(imageUnoptimized('/api/media/file/%2e%2e/private.webp', undefined, publicPrefixes), true);
    assert.equal(imageUnoptimized('/api/private/photo.webp?next=/api/media/file/', undefined, publicPrefixes), true);
});

test('each responsive source gets a real Next optimized srcSet or its original private URL', () => {
    const sources = ['/api/media/file/desktop.webp?v=1', '/api/private/mobile.webp', '/tablet.webp'];
    const props = sources.map((src) => getImageProps({
        src, alt: 'Photo', fill: true, sizes: '100vw',
        unoptimized: imageUnoptimized(src, undefined, publicPrefixes),
    }).props);
    assert.match(props[0]?.src ?? '', /^\/_next\/image\?url=/);
    assert.match(props[0]?.srcSet ?? '', /%3Fv%3D1/);
    assert.equal(props[1]?.src, sources[1]);
    assert.equal(props[1]?.srcSet, undefined);
    assert.match(props[2]?.srcSet ?? '', /\/_next\/image/);
});

test('priority and preload retain optimized Next sources; explicit opt-out removes srcSet', () => {
    for (const hints of [{ priority: true }, { preload: true }]) {
        const { props } = getImageProps({
            src: '/api/media/file/hero.webp', alt: 'Hero', width: 1600, height: 900,
            ...hints, unoptimized: imageUnoptimized('/api/media/file/hero.webp', undefined, publicPrefixes),
        });
        assert.match(props.src, /^\/_next\/image\?url=/);
        assert.match(props.srcSet ?? '', /\/_next\/image/);
    }
    const { props } = getImageProps({
        src: '/api/media/file/hero.webp', alt: 'Hero', width: 1600, height: 900,
        unoptimized: imageUnoptimized('/api/media/file/hero.webp', true, publicPrefixes),
    });
    assert.equal(props.src, '/api/media/file/hero.webp');
    assert.equal(props.srcSet, undefined);
});

test('actual Img SSR keeps private mobile sources and optimized priority source sets', () => {
    const html = renderToStaticMarkup(createElement(Img, {
        src: ['/desktop.webp', '/api/private/mobile.webp', '/tablet.webp'],
        alt: 'Responsive image', sizes: '100vw', priority: true,
    }));
    assert.match(html, /<source[^>]+srcSet="\/api\/private\/mobile.webp"/);
    assert.match(html, /<source[^>]+srcSet="\/_next\/image/);
    assert.match(html, /<img[^>]+fetchPriority="high"/);
    assert.match(html, /<img[^>]+srcSet="\/_next\/image/);
    const overridden = renderToStaticMarkup(createElement(Img, {
        src: ['/api/media/file/desktop.webp?v=1', '/api/media/file/mobile.webp?v=1', null],
        alt: 'Public media', sizes: '100vw', unoptimized: false, preload: true,
    }));
    assert.match(overridden, /<source[^>]+srcSet="\/_next\/image/);
    assert.match(overridden, /<img[^>]+srcSet="\/_next\/image/);
});

test('actual single-source Img SSR preloads the optimized image and protects private defaults', () => {
    // CommonJS resolves Next's default Image export the same way as the compiled consumer.
    const { Img: ServerImg } = createRequire(import.meta.url)('../src/components/Img/Img.tsx') as typeof import('../src/components/Img/Img');
    const html = renderToStaticMarkup(createElement(ServerImg, {
        src: '/api/media/file/hero.webp?v=1', alt: 'Hero', sizes: '100vw',
        preload: true, unoptimized: false,
    }));
    assert.match(html, /<link rel="preload" as="image" imageSrcSet="\/_next\/image/);
    assert.match(html, /%3Fv%3D1/);
    const privateHtml = renderToStaticMarkup(createElement(ServerImg, {
        src: '/api/private/hero.webp', alt: 'Private', sizes: '100vw', preload: true,
    }));
    assert.match(privateHtml, /<link rel="preload" as="image" href="\/api\/private\/hero.webp"/);
    assert.doesNotMatch(privateHtml, /\/_next\/image/);
});

test('image config rejects ambiguous, remote and malformed directory prefixes', () => {
    validateImages();
    validateImages({ optimizeApi: [] });
    validateImages({ optimizeApi: publicPrefixes });
    for (const prefix of ['/api/media/file', '/uploads/', 'https://cms.example/api/', '/api/a/?q=1', '/api/a/#x', '/api/a/../', '/api/%61/', '/api//media/', '/api/\\media/']) {
        assert.throws(() => validateImages({ optimizeApi: [prefix] }), /images.optimizeApi/);
    }
    assert.throws(() => validateImages(JSON.parse('{"optimizeApi":false}')), /images.optimizeApi/);
    assert.throws(() => validateImages(JSON.parse('{"optimizeAPI":[]}')), /only supports/);
});

test('fresh package fallback and generated runtime policy reach the same component resolver', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-image-policy-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
    for (const name of ['fallback', 'configured']) {
        const source = path.join(dir, name, 'src');
        fs.mkdirSync(path.join(source, 'components/Img'), { recursive: true });
        fs.mkdirSync(path.join(source, 'core/image-config'), { recursive: true });
        fs.copyFileSync(new URL('../src/components/Img/optimization.ts', import.meta.url), path.join(source, 'components/Img/optimization.ts'));
        fs.copyFileSync(new URL('../src/core/image-config/index.ts', import.meta.url), path.join(source, 'core/image-config/index.ts'));
        if (name === 'configured') {
            const output = path.join(source, 'core/image-config.ts');
            assert.equal(generateImages({ optimizeApi: publicPrefixes }, output), true);
            assert.equal(generateImages({ optimizeApi: publicPrefixes }, output), false);
        }
        const resolver = await import(pathToFileURL(path.join(source, 'components/Img/optimization.ts')).href);
        assert.equal(resolver.imageUnoptimized('/api/media/file/photo.webp'), name === 'fallback');
        assert.equal(resolver.imageUnoptimized('/api/private/photo.webp'), true);
    }
    assert.match(imagesTs(), /"optimizeApi":\[\]/);
});
