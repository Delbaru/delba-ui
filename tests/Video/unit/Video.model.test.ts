import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Video } from '../../../src/components/Video';
import { videoSource } from '../../../src/components/Video/Video.model';

test('responsive video does not request a desktop resource before hydration', () => {
    assert.equal(videoSource(['desktop', 'mobile', 'tablet'], { mounted: false, mobile: false, belowDesktop: false }), undefined);
    assert.equal(videoSource('single', { mounted: false, mobile: false, belowDesktop: false }), 'single');
});

test('video source follows mobile/tablet/desktop cascade without inventing missing sources', () => {
    const mobile = { mounted: true, mobile: true, belowDesktop: true };
    assert.equal(videoSource(['desktop', 'mobile', 'tablet'], mobile), 'mobile');
    assert.equal(videoSource(['desktop', null, { src: 'tablet' }], mobile), 'tablet');
    assert.equal(videoSource(['desktop', null, null], mobile), 'desktop');
    assert.equal(videoSource(['desktop', 'mobile', 'tablet'], { ...mobile, mobile: false }), 'tablet');
    assert.equal(videoSource(['desktop', 'mobile', 'tablet'], { ...mobile, mobile: false, belowDesktop: false }), 'desktop');
});

test('Video keeps appearance on the frame and media attributes on the native control', () => {
    const markup = renderToStaticMarkup(createElement(Video, {
        src: '/sample.mp4',
        poster: { src: '/poster.webp' },
        controls: true,
        'aria-label': 'Product demonstration',
        animate: { appearance: { when: 'load', effect: 'up' } },
    }));

    const frame = markup.match(/^<span\b[^>]*>/)?.[0] ?? '';
    const media = markup.match(/<video\b[^>]*>/)?.[0] ?? '';
    assert.match(frame, /data-reveal="up"/);
    assert.doesNotMatch(frame, /aria-label|controls/);
    assert.match(media, /src="\/sample\.mp4"/);
    assert.match(media, /poster="\/poster\.webp"/);
    assert.match(media, /controls=""/);
    assert.match(media, /aria-label="Product demonstration"/);
    assert.doesNotMatch(media, /data-reveal/);
});
