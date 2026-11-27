import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareFrontend, watchFrontend, resolveFrontendConfiguration } from './module.mjs';
import { prepareNextEnvironment } from './next-env.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND_SASS = path.join(TOOLS, 'sass');

/** Native Next integration receives settings directly from its owning application. */
export function withFrontend(nextConfig, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options))
        throw new Error('withFrontend requires explicit Frontend settings');
    for (const field of Object.keys(options)) {
        if (!['settings', 'root'].includes(field)) throw new Error(`Unsupported Frontend Next option: ${field}`);
    }
    const { settings } = options;
    let root = options.root ?? process.cwd();
    if (!settings || typeof settings !== 'object' || Array.isArray(settings))
        throw new Error('withFrontend requires explicit Frontend settings');
    if (typeof root !== 'string') throw new Error('Frontend root must be a path');
    root = path.resolve(root);
    return async (phase, context) => {
        await resolveFrontendConfiguration(settings);
        const publicEnvironment = prepareNextEnvironment();
        const config = typeof nextConfig === 'function' ? await nextConfig(phase, context) : (nextConfig ?? {});
        if (config.env && Object.keys(config.env).some(name => !Object.hasOwn(publicEnvironment, name)))
            throw new Error('Next env must come only from the module public projection');
        if (['phase-development-server', 'phase-production-build'].includes(phase) &&
            process.env.DELBA_FRONTEND_OWNER !== root) {
            if (phase === 'phase-development-server') {
                const watcher = await watchFrontend({ root, settings, env: process.env });
                process.once('exit', () => watcher.close());
            } else await prepareFrontend({ root, settings, env: process.env });
        }
        return {
            ...config,
            env: Object.fromEntries(Object.entries(publicEnvironment).map(([name, value]) => [name, String(value)])),
            transpilePackages: [...new Set([...(config.transpilePackages ?? []), '@delba/frontend'])],
            sassOptions: {
                api: 'modern-compiler', ...config.sassOptions,
                loadPaths: [FRONTEND_SASS, ...(config.sassOptions?.loadPaths ?? [])],
            },
        };
    };
}
