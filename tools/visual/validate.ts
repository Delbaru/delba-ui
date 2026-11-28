import type { FrontendConfig } from '../config';
import { validateMotion } from '../motion';
import { validateImages } from '../images';
import { validateMessages } from '../messages';
import { validateScrollbar } from '../scrollbar';
import { MOTION_DEFAULTS, MOTION_TIMING_DEFAULTS, CAROUSEL_BEHAVIOR_DEFAULTS, SCROLL_DEFAULTS } from '../../src/core/base/motion-defaults';
import { DEFAULT_EASING_ROLES } from '../../src/core/base/easing';
import { SCROLLBAR_DEFAULTS } from '../../src/core/base/scrollbar';
import { renderFrontendTheme } from './render';

type Dictionary = Record<string, unknown>;
const fail = (path: string, message: string): never => { throw new Error(`delbaFrontend.${path}: ${message}`); };
function object(value: unknown, path: string): asserts value is Dictionary {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
}
function text(value: unknown, path: string): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) fail(path, 'must be a nonempty string');
}
function number(value: unknown, path: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a finite number');
}
function grid(value: unknown, path: string): void {
    number(value, path);
    if (value % 4 !== 0) fail(path, 'ordinary geometry must be a multiple of four RPX');
}
function names(dictionary: Dictionary, path: string): void {
    for (const name of Object.keys(dictionary)) {
        if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(name)) fail(`${path}.${name}`, 'must be a CSS-safe role name');
    }
}
function required(value: unknown, keys: readonly string[], path: string): asserts value is Dictionary {
    object(value, path);
    for (const key of keys) if (value[key] === undefined) fail(`${path}.${key}`, 'is required');
}
function complete(value: unknown, template: Dictionary, path: string): void {
    required(value, Object.keys(template), path);
    for (const [key, child] of Object.entries(template)) {
        if (child && typeof child === 'object' && !Array.isArray(child)) complete(value[key], child as Dictionary, `${path}.${key}`);
    }
}
function tuple(value: unknown, path: string, validate: (entry: unknown, path: string) => void): void {
    if (!Array.isArray(value) || value.length !== 3 || value.some(entry => entry === undefined))
        fail(path, 'must be exactly [desktop, mobile, tablet], with null for skip');
    for (const [index, entry] of (value as unknown[]).entries()) if (entry !== null) validate(entry, `${path}[${index}]`);
}

/** Complete visual author contract. There is deliberately no merge with a starter theme. */
export function validateFrontend(value: unknown): asserts value is FrontendConfig {
    const sections = ['responsive', 'fonts', 'colors', 'gradients', 'typography', 'geometry', 'motion', 'variables', 'scrollbar'];
    required(value, sections, '');
    for (const section of Object.keys(value)) if (![...sections, 'images', 'messages'].includes(section)) fail(section, 'is unsupported');

    required(value.responsive, ['mobile', 'tablet', 'desktop'], 'responsive');
    const responsive = value.responsive;
    for (const band of ['mobile', 'tablet', 'desktop']) {
        const properties = band === 'desktop' ? ['minWidth', 'designWidth', 'scale', 'scaleLimit'] : ['minWidth', 'designWidth', 'scale'];
        const definition = responsive[band];
        required(definition, properties, `responsive.${band}`);
        for (const key of properties.filter(key => key !== 'scale')) number(definition[key], `responsive.${band}.${key}`);
        if (!['fixed', 'fluid'].includes(String(definition.scale))) fail(`responsive.${band}.scale`, 'must be fixed or fluid');
        if ((definition.designWidth as number) <= 0) fail(`responsive.${band}.designWidth`, 'must be positive');
        for (const key of Object.keys(definition)) if (!properties.includes(key)) fail(`responsive.${band}.${key}`, 'is unsupported');
    }
    const mobile = responsive.mobile as Dictionary;
    const tablet = responsive.tablet as Dictionary;
    const desktop = responsive.desktop as Dictionary;
    if (mobile.minWidth !== 0 || !(Number(tablet.minWidth) > 0) || !(Number(desktop.minWidth) > Number(tablet.minWidth)))
        fail('responsive', 'bands must start at zero and have increasing minWidth');
    if (Number(desktop.scaleLimit) < Number(desktop.designWidth)) fail('responsive.desktop.scaleLimit', 'must be at least designWidth');

    required(value.fonts, ['primary'], 'fonts');
    names(value.fonts, 'fonts');
    for (const [name, font] of Object.entries(value.fonts)) {
        const path = `fonts.${name}`;
        required(font, ['family', 'fallback', 'faces'], path);
        text(font.family, `${path}.family`);
        text(font.fallback, `${path}.fallback`);
        if (!Array.isArray(font.faces)) fail(`${path}.faces`, 'must be an array (empty for system fonts)');
        for (const [index, face] of (font.faces as unknown[]).entries()) {
            required(face, ['src', 'weight', 'style', 'display'], `${path}.faces[${index}]`);
            text(face.src, `${path}.faces[${index}].src`);
            if (typeof face.weight !== 'number') text(face.weight, `${path}.faces[${index}].weight`);
            if (!['normal', 'italic'].includes(String(face.style))) fail(path, 'invalid font style');
            if (!['swap', 'block', 'fallback', 'optional'].includes(String(face.display))) fail(path, 'invalid font display');
        }
    }

    required(value.colors, ['primary', 'secondary', 'surface', 'text', 'line', 'error', 'warning', 'success', 'info'], 'colors');
    names(value.colors, 'colors');
    for (const [role, color] of Object.entries(value.colors)) {
        if (typeof color === 'string') {
            if (['primary', 'secondary'].includes(role)) fail(`colors.${role}`, 'must declare normal/hover/pressed/foreground');
            text(color, `colors.${role}`);
        } else {
            required(color, ['normal', 'hover', 'pressed', 'foreground'], `colors.${role}`);
            for (const key of Object.keys(color)) {
                if (!['normal', 'hover', 'pressed', 'foreground'].includes(key)) fail(`colors.${role}.${key}`, 'is unsupported');
                text(color[key], `colors.${role}.${key}`);
            }
        }
    }
    object(value.gradients, 'gradients');
    names(value.gradients, 'gradients');
    for (const [role, gradient] of Object.entries(value.gradients)) text(gradient, `gradients.${role}`);

    required(value.typography, ['body', 'caption', 'micro', 'title'], 'typography');
    names(value.typography, 'typography');
    const typographyFields = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform'];
    for (const [role, typography] of Object.entries(value.typography)) {
        required(typography, typographyFields, `typography.${role}`);
        for (const field of Object.keys(typography)) {
            if (!typographyFields.includes(field)) fail(`typography.${role}.${field}`, 'is unsupported');
            tuple(typography[field], `typography.${role}.${field}`, (entry, path) => {
                if (['fontSize', 'fontWeight', 'letterSpacing'].includes(field)) number(entry, path);
                else if (field === 'lineHeight' && typeof entry === 'number') number(entry, path);
                else text(entry, path);
                if (field === 'fontFamily' && !Object.hasOwn(value.fonts as object, String(entry))) fail(path, 'unknown font role');
                if (field === 'fontSize' && Number(entry) <= 0) fail(path, 'must be positive');
                if (field === 'textTransform' && !['none', 'uppercase', 'lowercase', 'capitalize', 'full-width'].includes(String(entry))) fail(path, 'invalid text transform');
            });
        }
    }

    required(value.geometry, ['dimensions', 'positions', 'radii', 'padding', 'lines', 'shadows'], 'geometry');
    for (const [group, entries] of Object.entries(value.geometry)) {
        if (!['spaces', 'dimensions', 'positions', 'radii', 'padding', 'lines', 'shadows'].includes(group)) fail(`geometry.${group}`, 'is unsupported');
        object(entries, `geometry.${group}`);
        names(entries, `geometry.${group}`);
        for (const [role, entry] of Object.entries(entries)) {
            const path = `geometry.${group}.${role}`;
            if (group === 'spaces' && /^\d+$/.test(role)) fail(path, 'numeric spacing tokens are generated from source usage');
            if (group === 'shadows') text(entry, path);
            else if (group === 'lines') {
                if (!Array.isArray(entry) || ![2, 3].includes(entry.length)) fail(path, 'must be [thickness,color,style?]');
                number((entry as unknown[])[0], path);
                text((entry as unknown[])[1], path);
                if ((entry as unknown[]).length === 3) text((entry as unknown[])[2], path);
            } else if (group === 'padding' && Array.isArray(entry)) {
                if (![2, 4].includes(entry.length)) fail(path, 'must be a scalar or two/four sides');
                entry.forEach(item => grid(item, path));
            } else grid(entry, path);
        }
    }
    for (const group of ['padding', 'radii']) {
        if ((value.geometry[group] as Dictionary).none !== 0) fail(`geometry.${group}.none`, 'must explicitly be zero');
    }
    if ((value.geometry.radii as Dictionary).sm === undefined) fail('geometry.radii.sm', 'is required by control presets');
    object(value.variables, 'variables');
    names(value.variables, 'variables');
    for (const [role, variable] of Object.entries(value.variables)) {
        if (/^s-\d+$/.test(role)) fail(`variables.${role}`, 'numeric spacing tokens belong to the spacing engine');
        if (['rpx', 'base-width'].includes(role) || /^(type-|font-family-|t-d-|t-m-|t-t-f-)/.test(role))
            fail(`variables.${role}`, 'is owned by a structured visual section');
        const validate = (entry: unknown, path: string) => typeof entry === 'number' ? grid(entry, path) : text(entry, path);
        if (Array.isArray(variable)) tuple(variable, `variables.${role}`, validate);
        else validate(variable, `variables.${role}`);
    }

    required(value.motion, ['timing', 'distance', 'defaults', 'carousel', 'easing', 'visibility', 'inView', 'scroll'], 'motion');
    complete(value.motion.timing, MOTION_TIMING_DEFAULTS, 'motion.timing');
    complete(value.motion.defaults, MOTION_DEFAULTS, 'motion.defaults');
    complete(value.motion.carousel, CAROUSEL_BEHAVIOR_DEFAULTS as unknown as Dictionary, 'motion.carousel');
    complete(value.motion.easing, DEFAULT_EASING_ROLES, 'motion.easing');
    complete(value.motion.scroll, SCROLL_DEFAULTS, 'motion.scroll');
    required(value.motion.visibility, ['rootMargin'], 'motion.visibility');
    required(value.motion.inView, ['rootMargin', 'threshold'], 'motion.inView');
    complete(value.scrollbar, SCROLLBAR_DEFAULTS, 'scrollbar');
    validateMotion(value.motion);
    validateScrollbar(value.scrollbar as FrontendConfig['scrollbar']);
    validateImages(value.images as FrontendConfig['images']);
    validateMessages(value.messages as FrontendConfig['messages']);
    // Detect colliding generated names before any output is written.
    renderFrontendTheme(value as unknown as FrontendConfig);
}
