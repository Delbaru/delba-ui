import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFrontendSources } from '../../../tools/registration.mjs';
await registerFrontendSources();
const { starterFrontend } = await import('../../../tools/visual/starter.ts');
const { validateFrontend } = await import('../../../tools/visual/validate.ts');
const { renderFrontendTheme } = await import('../../../tools/visual/render.ts');
const { imageSizes } = await import('../../../src/core/base/scale.ts');
const { responsiveScaleCss } = await import('../../../src/core/base/responsive-definition.ts');

const fixture = () => structuredClone(starterFrontend);

test('named motion distances may be empty without adding an unused author token', () => {
    const config = fixture();
    config.motion.distance = {};
    validateFrontend(config);
    config.motion.distance = { reveal: -4 };
    assert.throws(() => validateFrontend(config), /non-negative/);
});

test('every visual section and core role is explicit, without starter merging', () => {
    validateFrontend(starterFrontend);
    for (const key of ['responsive', 'fonts', 'colors', 'gradients', 'typography', 'geometry', 'motion', 'variables', 'scrollbar']) {
        const config = fixture();
        delete config[key];
        assert.throws(() => validateFrontend(config), /required/);
    }
    for (const [section, role] of [['colors', 'primary'], ['fonts', 'primary'], ['typography', 'body'], ['typography', 'title']]) {
        const config = fixture();
        delete config[section][role];
        assert.throws(() => validateFrontend(config), /required/);
    }
    const config = fixture();
    delete config.motion.timing.fast;
    assert.throws(() => validateFrontend(config), /motion.timing.fast/);
});

test('interactive colors are complete; additional roles and inherited color remain author-owned', () => {
    const config = fixture();
    delete config.colors.primary.pressed;
    assert.throws(() => validateFrontend(config), /pressed/);
    config.colors.primary.pressed = 'light-dark(#111, #eee)';
    config.colors.brand = '#f80';
    config.colors.inherit = 'inherit';
    validateFrontend(config);
    const result = renderFrontendTheme(config);
    assert.match(result.css, /--primary-pressed: light-dark\(#111, #eee\)/);
    assert.match(result.skin.tokens, /'brand': var\(--brand\)/);
    assert.match(result.skin.tokens, /'inherit': inherit/);
    assert.doesNotMatch(result.skin.tokens, /var\(--inherit\)/);
});

test('typography uses exact per-field triples; null does not leak desktop into mobile', () => {
    const config = fixture();
    config.typography.body.fontSize = [13, null, 19];
    config.typography.body.letterSpacing = [0.2, 0, -0.1];
    validateFrontend(config);
    const result = renderFrontendTheme(config);
    const mobile = result.css.split('@media (max-width: 767px)')[2]?.split('@media')[0];
    assert.match(result.css, /--type-body-font-size: calc\(13 \* var\(--rpx\)\)/);
    assert.match(result.css, /--type-body-font-size: calc\(19 \* var\(--rpx\)\)/);
    assert.ok(mobile && !mobile.includes('--type-body-font-size:'));
    config.typography.body.fontSize = [13, 19];
    assert.throws(() => validateFrontend(config), /exactly/);
    assert.match(result.typographyScss, /@mixin typography-device/);
    assert.match(result.typographyScss, /@mixin breakpoint/);
    assert.match(result.typographyScss, /--rpx: 1px/);
    assert.doesNotMatch(result.typographyScss, /revert-layer|font: var/);
    const runtime = result.runtime.slice(result.runtime.indexOf('=') + 1).replace(/as const;\s*$/, '');
    const projection = JSON.parse(runtime);
    assert.ok(projection.typographyFields.body.desktop.includes('font-size'));
    assert.ok(!projection.typographyFields.body.mobile.includes('font-size'));
    assert.ok(projection.typographyFields.body.mobile.includes('font-weight'));
});

test('font stacks and custom role token names never collide', () => {
    const config = fixture();
    config.fonts.body = { family: 'Example', fallback: 'serif', faces: [] };
    config.typography.body.fontFamily = ['body', 'body', 'body'];
    config.typography.subHeading = structuredClone(config.typography.body);
    config.typography['card-title'] = structuredClone(config.typography.title);
    validateFrontend(config);
    const result = renderFrontendTheme(config);
    assert.match(result.css, /--font-family-body: 'Example', serif/);
    assert.match(result.css, /--type-body-font-family: var\(--font-family-body\)/);
    assert.match(result.typographyScss, /'subHeading': 'sub-heading'/);
    assert.match(result.runtime, /"card-title"/);
    assert.doesNotMatch(result.css, /--font-body:/);
});

test('geometry has no upper ceiling; four-RPX rule excludes type and border microdetails', () => {
    const config = fixture();
    config.geometry.dimensions.canvas = 4444;
    config.geometry.lines.hair = [0.5, 'var(--line)'];
    config.typography.body.fontSize = [13, 13, 13];
    config.scrollbar.width = 3;
    validateFrontend(config);
    assert.match(renderFrontendTheme(config).css, /--size-canvas: calc\(4444 \* var\(--rpx\)\)/);
    config.geometry.padding.panel = [12, 10];
    assert.throws(() => validateFrontend(config), /multiple of four/);
});

test('fixed and fluid bands share one scale contract between CSS and image sizes', () => {
    const config = fixture();
    for (const band of Object.values(config.responsive)) band.scale = 'fixed';
    validateFrontend(config);
    const css = responsiveScaleCss(config.responsive);
    assert.equal((css.match(/--rpx: 1px/g) ?? []).length, 3);
    assert.equal(imageSizes({ desktop: 624, mobile: 280, tablet: 704 }, config.responsive),
        '(max-width: 767px) 280px, (max-width: 1023px) 704px, 624px');
    const fluid = starterFrontend.responsive;
    assert.equal(imageSizes({ desktop: 624, mobile: 280, tablet: 704 }, fluid),
        '(max-width: 767px) 87.5vw, (max-width: 1023px) 91.67vw, (min-width: 2560px) 832px, 32.5vw');
});

test('numeric custom variables are RPX grid lengths, including responsive tuples', () => {
    const config = fixture();
    config.variables['header-height'] = 4000;
    config.variables['panel-offset'] = [0, null, -16];
    validateFrontend(config);
    config.variables['header-height'] = 17;
    assert.throws(() => validateFrontend(config), /multiple of four/);
    config.variables['header-height'] = '17px';
    validateFrontend(config);
    config.variables['panel-offset'] = [16, 17, null];
    assert.throws(() => validateFrontend(config), /multiple of four/);
});
