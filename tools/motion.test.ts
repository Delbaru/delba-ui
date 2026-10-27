import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

import type { UiMotion } from './config';
import { motionScss, motionTs, validateMotion, writeMotionScss } from './motion';
import { cubicBezier, motionEasing } from '../src/core/base/easing';

const validMotion = {
    timing: {
        flash: 0.06,
        fast: 0.16,
        gentleEase: 0.42,
    },
    distance: { small: 16, full: '100%' },
} as const satisfies UiMotion;

test('fresh package imports public motion before any ignored runtime config has been generated', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-motion-bootstrap-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.mkdirSync(path.join(dir, 'src/core/motion-config'), { recursive: true });
    fs.cpSync(
        path.resolve(import.meta.dirname, '../src/core/base'),
        path.join(dir, 'src/core/base'),
        { recursive: true },
    );
    fs.copyFileSync(
        path.resolve(import.meta.dirname, '../src/core/motion-config/index.ts'),
        path.join(dir, 'src/core/motion-config/index.ts'),
    );
    fs.copyFileSync(
        path.resolve(import.meta.dirname, '../src/motion.ts'),
        path.join(dir, 'src/motion.ts'),
    );
    fs.copyFileSync(
        path.resolve(import.meta.dirname, '../src/core/utils.ts'),
        path.join(dir, 'src/core/utils.ts'),
    );
    fs.mkdirSync(path.join(dir, 'src/components/SmoothScroll'), { recursive: true });
    fs.copyFileSync(
        path.resolve(import.meta.dirname, '../src/components/SmoothScroll/smooth-scroll.ts'),
        path.join(dir, 'src/components/SmoothScroll/smooth-scroll.ts'),
    );
    fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
    assert.equal(fs.existsSync(path.join(dir, 'src/core/motion-config.ts')), false);
    const entry = await import(pathToFileURL(path.join(dir, 'src/motion.ts')).href);
    assert.equal(entry.motionDefaults.textSlide.duration, 0.4);
    assert.equal(entry.scrollEasing.ease(0.25), 0.0625);
    const timing = await import(pathToFileURL(path.join(dir, 'src/core/base/timing.ts')).href);
    assert.equal(timing.readMotionTimeMs('normal'), 500);

    const configured = path.join(dir, 'configured');
    fs.cpSync(path.join(dir, 'src'), path.join(configured, 'src'), { recursive: true });
    fs.writeFileSync(path.join(configured, 'package.json'), '{"type":"module"}');
    fs.writeFileSync(
        path.join(configured, 'src/core/motion-config.ts'),
        motionTs({
            timing: { normal: 0.42 },
            scroll: {
                lerp: 0.3,
                minDuration: 0.2,
                maxDuration: 0.9,
                durationPerScreen: 0.1,
                easing: motionEasing.linear,
            },
        }),
    );
    const configuredTiming = await import(
        pathToFileURL(path.join(configured, 'src/core/base/timing.ts')).href
    );
    assert.equal(configuredTiming.readMotionTimeMs('normal', undefined, 0.7), 420);
    const runtime = await import(
        pathToFileURL(path.join(configured, 'src/core/base/motion-config.ts')).href
    );
    const scroll = await import(
        pathToFileURL(path.join(configured, 'src/components/SmoothScroll/smooth-scroll.ts')).href
    );
    assert.equal(scroll.autoDurationMs(0, 800), 200);
    assert.equal(scroll.autoDurationMs(800, 800), 300);
    assert.equal(scroll.autoDurationMs(1e7, 800), 900);
    assert.ok(Math.abs(scroll.lerpStep(0, 100, runtime.motionScroll.lerp, 1000 / 60) - 30) < 1e-9);
    assert.deepEqual(scroll.tweenPosition(0, 100, 250, 1000, runtime.motionScroll.easing), {
        y: 25,
        done: false,
    });
});

test('project timing types follow config keys, including custom names and renames', () => {
    const fixture = path.join(import.meta.dirname, 'motion-types.fixture.ts');
    const source = `
    import type { MotionTime } from '../src/core/base/timing';
    import type { MotionDistance } from '../src/core/base/distance';
    const config = { motion: { timing: { gentleEase: 0.42 }, distance: { full: '100%', compact: 16 } } };
    declare global {
      interface UiMotionTiming { names: keyof typeof config.motion.timing; }
      interface UiMotionDistance { names: keyof typeof config.motion.distance; }
    }
    const named: MotionTime = 'gentleEase';
    const exact: MotionTime = 0.16;
    // @ts-expect-error names absent from config cannot be used
    const oldName: MotionTime = 'slow';
    // @ts-expect-error misspelled names cannot be used
    const typo: MotionTime = 'gentleEsae';
    const namedDistance: MotionDistance = 'full';
    const percentDistance: MotionDistance = '100%';
    const exactDistance: MotionDistance = 24;
    // @ts-expect-error names absent from config cannot be used
    const oldDistance: MotionDistance = 'large';
  `;
    const options: ts.CompilerOptions = {
        strict: true,
        noEmit: true,
        types: [],
        target: ts.ScriptTarget.ES2022,
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) =>
        path.resolve(file) === fixture
            ? ts.createSourceFile(file, source, languageVersion, true)
            : getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile);
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
    assert.deepEqual(
        diagnostics.map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ),
        [],
    );
});

test('UiMotion accepts arbitrary readonly timing names and keeps values numeric', () => {
    const readonlyMotion = { timing: { quick: 0.1, veryGentle: 0.7 } } as const satisfies UiMotion;
    assert.doesNotThrow(() => validateMotion(readonlyMotion));

    // @ts-expect-error duration values are numbers in seconds
    const invalidValue: UiMotion = { timing: { quick: '0.1s' } };
    void invalidValue;
});

test('validateMotion accepts absence and a non-empty custom timing map', () => {
    assert.doesNotThrow(() => validateMotion(undefined));
    assert.doesNotThrow(() => validateMotion(validMotion));
    assert.doesNotThrow(() => validateMotion({ timing: { normal: 0 } }));
});

test('validateMotion rejects malformed objects, empty maps, invalid names and invalid durations', () => {
    assert.throws(
        () =>
            validateMotion({ timing: { normal: 0.5 }, defaults: { smoothScroll: { lerp: 0.2 } } }),
        /defaults.smoothScroll/,
    );
    assert.throws(
        () => validateMotion({ timing: { normal: 0.5 }, easing: { scroll: 'linear' } }),
        /easing.scroll/,
    );
    assert.throws(
        () =>
            validateMotion({ timing: { normal: 0.5 }, scroll: { minDuration: 2, maxDuration: 1 } }),
        /minDuration/,
    );
    assert.throws(() => validateMotion(null), /motion must be an object/);
    assert.throws(
        () => validateMotion({ timing: validMotion.timing, extra: true }),
        /motion\.extra/,
    );
    assert.throws(() => validateMotion({}), /motion\.timing is required/);
    assert.throws(
        () => validateMotion(Object.create({ timing: validMotion.timing })),
        /motion must be an object/,
    );
    assert.throws(
        () => validateMotion({ timing: {} }),
        /motion\.timing must contain at least one duration/,
    );
    assert.throws(
        () => validateMotion({ timing: { fast: 0.1 }, distance: {} }),
        /motion\.distance must contain at least one distance/,
    );
    assert.throws(() => validateMotion({ timing: [] }), /motion\.timing must be an object/);
    assert.throws(
        () => validateMotion({ timing: Object.create({ fast: 0.1 }) }),
        /motion\.timing must be an object/,
    );

    for (const name of ['very-fast', 'Fast', '_quick', 'quick-fast', '2x']) {
        assert.throws(
            () => validateMotion({ timing: { [name]: 0.2 } }),
            new RegExp(`motion\\.timing\\.${name} must be a camelCase name`),
        );
    }

    for (const value of [NaN, Infinity, -Infinity, -0.1, '0.2']) {
        assert.throws(
            () => validateMotion({ timing: { slow: value } }),
            /motion\.timing\.slow must be a finite non-negative number of seconds/,
        );
    }
    for (const value of [
        'calc(100% - 1px)',
        'var(--x)',
        '-100%',
        '100vh',
        'small',
        '100',
        Infinity,
        -1,
    ]) {
        assert.throws(
            () => validateMotion({ timing: { fast: 0.1 }, distance: { full: value } }),
            /motion\.distance\.full must be/,
        );
    }
    assert.throws(
        () => validateMotion({ timing: { fast: 0.1 }, distance: { 'bad-name': 12 } }),
        /motion\.distance\.bad-name must be a camelCase name/,
    );
});

test('motionScss always emits kit defaults and overrides them with project timing and distance', () => {
    assert.match(motionScss(undefined), /--t-m-text-slide-duration: 0.4s;/);
    const output = motionScss(validMotion);
    for (const declaration of [
        '--t-d-flash: 0.06s;',
        '--t-d-fast: 0.16s;',
        '--t-d-gentle-ease: 0.42s;',
        '--t-m-distance-small: calc(var(--rpx) * 16);',
        '--t-m-distance-full: 100%;',
    ])
        assert.ok(output.includes(declaration), declaration);
    assert.equal((output.match(/--t-d-fast:/g) ?? []).length, 1);
});

test('one motion config drives semantic CSS, SSR defaults, inView and scroll presets', () => {
    const config = {
        timing: { normal: 0.52 },
        defaults: {
            textSlide: { duration: 'normal' },
            textReveal: { maxDuration: 0.8 },
            marquee: { speed: 93, easeDuration: 'normal' },
            carousel: { duration: 0.6 },
        },
        inView: {
            rootMargin: { top: '0px', right: '0px', bottom: '-10%', left: '0px' },
            threshold: 0.2,
        },
        scroll: {
            duration: 1.3,
            lerp: 0.08,
            offset: '--header-h',
            easing: motionEasing.easeInOutCubic,
        },
        easing: { out: motionEasing.out, default: cubicBezier(0.22, 0.61, 0.36, 1) },
    } satisfies UiMotion;
    const css = motionScss(config);
    assert.match(css, /--t-m-text-slide-duration: var\(--t-d-normal\);/);
    assert.match(css, /--t-m-text-reveal-max-duration: 0.8s;/);
    assert.match(css, /--t-m-marquee-speed: 93;/);
    assert.match(css, /--t-m-marquee-ease-duration: var\(--t-d-normal\);/);
    assert.match(css, /--t-t-f-default: cubic-bezier\(0.22, 0.61, 0.36, 1\);/);
    const runtime = JSON.parse(motionTs(config).split(' = ')[1]?.replace(/;\n$/, '') ?? 'null');
    assert.equal(runtime.inView.rootMargin, '0px 0px -10% 0px');
    assert.equal(runtime.defaults.textSlide.duration, 'normal');
    assert.equal(runtime.defaults.marquee.speed, 93);
    assert.equal(runtime.scroll.duration, 1.3);
    assert.equal(runtime.scroll.easing, 'easeInOutCubic');
    assert.deepEqual(runtime.easing.default, [0.22, 0.61, 0.36, 1]);
    for (const defaults of [
        { textSlide: { duration: -1 } },
        { textReveal: { typo: 1 } },
        { nope: { duration: 1 } },
    ])
        assert.throws(() => validateMotion({ timing: { fast: 0.1 }, defaults }), /motion.defaults/);
});

test('writeMotionScss writes only on content changes', (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-motion-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const output = path.join(dir, '_motion.scss');

    assert.equal(writeMotionScss(output, validMotion), true);
    assert.equal(fs.readFileSync(output, 'utf8'), motionScss(validMotion));
    assert.equal(writeMotionScss(output, validMotion), false);
    assert.equal(writeMotionScss(output), true);
    assert.equal(fs.readFileSync(output, 'utf8'), motionScss(undefined));
});

test('continuous motion visibility is validated and emitted without changing reveal options', () => {
    const motion = { timing: { normal: 0.5 }, visibility: { rootMargin: '0px 0px 15% 0px' } };
    assert.doesNotThrow(() => validateMotion(motion));
    assert.match(motionScss(motion), /--t-m-visibility-root-margin: 0px 0px 15% 0px;/);
    for (const rootMargin of [
        '100vh',
        'var(--margin)',
        '0px; color:red',
        '0px 0px 0px 0px 0px',
        '',
    ]) {
        assert.throws(
            () => validateMotion({ ...motion, visibility: { rootMargin } }),
            /rootMargin/,
        );
    }
    assert.throws(
        () => validateMotion({ ...motion, visibility: { rootMargin: '0px', typo: true } }),
        /visibility.typo/,
    );
});
