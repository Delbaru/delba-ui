import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFrontendSources } from './registration.mjs';

export async function resolveFrontendConfiguration(settings, _rawEnv, _context) {
    await registerFrontendSources();
    const { validateFrontend } = await import('./visual/validate.ts');
    validateFrontend(settings);
    return { settings, environment: {}, public: {} };
}

export function frontendUtilityOptions(root, settings) {
    const library = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    return {
        scan: ['src', path.relative(root, library)],
        authoredRoot: root,
        implementationRoot: library,
        seeds: {
            p: Object.values(settings.geometry.padding),
            r: Object.values(settings.geometry.radii),
            gap: Object.values(settings.geometry.spaces ?? {}),
        },
        typography: Object.keys(settings.typography),
    };
}
