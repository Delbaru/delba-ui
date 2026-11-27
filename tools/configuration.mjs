import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFrontendSources } from './registration.mjs';

const ownFields = new Set(['theme', 'typography', 'skins', 'scale', 'motion', 'images', 'scrollbar', 'messages']);
function object(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${name} must be an object`);
}

/** Resolve only the Frontend section supplied by the host. No files or ENV are discovered. */
export async function resolveFrontendConfiguration(settings, _rawEnv, _context) {
    object(settings, 'delbaFrontend');
    for (const field of Object.keys(settings)) {
        if (!ownFields.has(field)) throw new Error(`delbaFrontend.${field} is unsupported`);
    }
    if (settings.theme !== undefined) {
        const theme = settings.theme;
        object(theme, 'delbaFrontend.theme');
        for (const field of Object.keys(theme)) {
            if (!['sources', 'padding'].includes(field)) throw new Error(`delbaFrontend.theme.${field} is unsupported`);
        }
        if (!Array.isArray(theme.sources) || !theme.sources.length ||
            theme.sources.some(source => typeof source !== 'string' || !source.trim()))
            throw new Error('delbaFrontend.theme.sources must be nonempty paths');
        if (theme.padding !== undefined) {
            object(theme.padding, 'delbaFrontend.theme.padding');
            for (const padding of Object.values(theme.padding)) {
                const values = Array.isArray(padding) ? padding : [padding];
                if ((Array.isArray(padding) && ![2, 4].includes(values.length)) ||
                    values.some(value => typeof value !== 'number' || !Number.isFinite(value)))
                    throw new Error('theme.padding values must be numbers or two/four-number tuples');
            }
        }
    }
    if (settings.typography !== undefined && (!Array.isArray(settings.typography) ||
        settings.typography.some(value => typeof value !== 'string' || !value.trim())))
        throw new Error('delbaFrontend.typography must be an array of names');
    for (const field of ['scale', 'skins']) {
        if (settings[field] !== undefined) object(settings[field], `delbaFrontend.${field}`);
    }
    if (settings.scale) {
        for (const field of Object.keys(settings.scale)) {
            if (!['mobile', 'tablet', 'desktop', 'max'].includes(field))
                throw new Error(`delbaFrontend.scale.${field} is unsupported`);
        }
    }
    if (settings.skins) {
        const skins = settings.skins;
        for (const field of Object.keys(skins)) {
            if (!['dir', 'fills', 'lines', 'texts', 'maps', 'states', 'effects'].includes(field))
                throw new Error(`delbaFrontend.skins.${field} is unsupported`);
        }
        for (const field of ['dir', 'states']) {
            if (skins[field] !== undefined && (typeof skins[field] !== 'string' || !skins[field].trim()))
                throw new Error(`delbaFrontend.skins.${field} must be a path`);
        }
        for (const field of ['fills', 'texts', 'lines']) object(skins[field], `delbaFrontend.skins.${field}`);
        for (const field of ['fills', 'texts']) {
            if (Object.values(skins[field]).some(value => typeof value !== 'string'))
                throw new Error(`delbaFrontend.skins.${field} must contain strings`);
        }
        if (Object.values(skins.lines).some(value => !Array.isArray(value) || value.length !== 2 ||
            typeof value[0] !== 'number' || !Number.isFinite(value[0]) || typeof value[1] !== 'string'))
            throw new Error('delbaFrontend.skins.lines must contain [number, string] pairs');
        if (skins.maps !== undefined) {
            object(skins.maps, 'delbaFrontend.skins.maps');
            for (const dictionary of Object.values(skins.maps)) {
                object(dictionary, 'delbaFrontend.skins.maps dictionary');
                if (Object.values(dictionary).some(value => typeof value !== 'string'))
                    throw new Error('delbaFrontend.skins.maps must contain strings');
            }
        }
        if (skins.effects !== undefined && (!Array.isArray(skins.effects) ||
            skins.effects.some(value => typeof value !== 'string' || !value.trim())))
            throw new Error('delbaFrontend.skins.effects must contain names');
    }
    await registerFrontendSources();
    const [{validateMotion}, {validateImages}, {validateScrollbar}, {validateMessages}, {resolveScale}] = await Promise.all([
        import('./motion.ts'), import('./images.ts'), import('./scrollbar.ts'), import('./messages.ts'),
        import('../src/core/base/scale.ts'),
    ]);
    validateMotion(settings.motion);
    validateImages(settings.images);
    validateScrollbar(settings.scrollbar);
    validateMessages(settings.messages);
    resolveScale(settings.scale);
    return { settings, environment: {}, public: {} };
}

/** One utility input shared by module generation and native Next integration. */
export function frontendUtilityOptions(root, settings) {
    const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    return {
        scan: ['src', path.relative(root, library)],
        seeds: { p: Object.values(settings.theme?.padding ?? {}) },
        typography: settings.typography,
        scale: settings.scale,
    };
}
