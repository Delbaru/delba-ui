import assert from 'node:assert/strict';
import test from 'node:test';
import { videoSource } from '../Video.model';

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
