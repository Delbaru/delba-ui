import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileString } from 'sass';
import { scrollbarProps } from '../src/components/ScrollArea/scrollbar';
import { SCROLLBAR_CONFIG } from '../src/core/scrollbar-config';
import { scrollbarCss, scrollbarTs, generateScrollbar, validateScrollbar } from './scrollbar';

test('scrollbar config defaults, opt-out and zero timings reach SSR styles and generated CSS', () => {
    assert.match(scrollbarTs(), /"autoHide":true/);
    assert.match(scrollbarTs(), /"width":6/);
    const style = scrollbarProps({ autoHide: false, width: 0, showDuration: 0, hideDelay: 0, fadeDuration: 0 }).style;
    assert.equal(style['--ui-scrollbar-rest-opacity' as keyof typeof style], 1);
    assert.equal(style['--ui-scrollbar-native-width' as keyof typeof style], 'none');
    assert.equal(style['--ui-scrollbar-show-duration' as keyof typeof style], '0s');
    assert.equal(style['--ui-scrollbar-hide-delay' as keyof typeof style], '0s');
    assert.equal(scrollbarProps({ width: undefined }).style['--ui-scrollbar-width' as keyof typeof style], `calc(${SCROLLBAR_CONFIG.width} * var(--rpx))`);
    assert.match(scrollbarCss({ width: 3, hideDelay: 0.3 }), /--ui-scrollbar-width: calc\(3 \* var\(--rpx\)\)/);
    assert.match(scrollbarCss({ hideDelay: 0.3 }), /--ui-scrollbar-hide-delay: 0.3s/);
});

test('scrollbar config rejects invalid runtime input before writing; generation is repeatable', () => {
    for (const value of ['null', '[]', '{"fadeDuration":-1}', '{"hideDelay":"300ms"}', '{"autoHide":"yes"}', '{"typo":true}', '{"gutter":"both"}']) {
        assert.throws(() => validateScrollbar(JSON.parse(value)), /scrollbar/);
    }
    assert.throws(() => validateScrollbar({ showDuration: Infinity }), /scrollbar/);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-scrollbar-'));
    try {
        const output = path.join(directory, 'scrollbar-config.ts');
        assert.equal(generateScrollbar({ hideDelay: 0.42, autoHide: false }, output), true);
        assert.match(fs.readFileSync(output, 'utf8'), /"hideDelay":0.42/);
        assert.match(fs.readFileSync(path.join(directory, '_scrollbar-policy.scss'), 'utf8'), /--ui-scrollbar-rest-opacity: 1/);
        assert.equal(generateScrollbar({ hideDelay: 0.42, autoHide: false }, output), false);
        assert.equal(generateScrollbar({ hideDelay: 0.5 }, output), true);
    } finally { fs.rmSync(directory, { recursive: true }); }
});

test('fresh stylesheet checkout resolves tracked defaults before config generation', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-scrollbar-fallback-'));
    try {
        const fallback = path.join(directory, 'scrollbar-policy');
        fs.mkdirSync(fallback);
        fs.copyFileSync(new URL('../src/core/scrollbar-policy/_index.scss', import.meta.url), path.join(fallback, '_index.scss'));
        const css = compileString('@use "./scrollbar-policy";', { url: pathToFileURL(path.join(directory, 'entry.scss')) }).css;
        assert.match(css, /--ui-scrollbar-width: calc\(6 \* var\(--rpx\)\)/);
        assert.match(css, /--ui-scrollbar-show-duration: 0.15s/);
        assert.match(css, /--ui-scrollbar-hide-delay: 0.3s/);
    } finally { fs.rmSync(directory, { recursive: true }); }
});
