import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let registered = false;
let sequence = 0;

function commonJsConfig(file) {
    if (/\.[cm]ts$/.test(file)) return file.endsWith('.cts');
    for (let directory = path.dirname(file); ; directory = path.dirname(directory)) {
        const manifest = path.join(directory, 'package.json');
        if (existsSync(manifest))
            return JSON.parse(readFileSync(manifest, 'utf8')).type !== 'module';
        if (path.dirname(directory) === directory) return true;
    }
}

/** Locate an explicit config, a local UI config, or the nearest project composition. */
export function resolveConfigFile({ cwd = process.cwd(), config } = {}) {
    if (config === null) return null;
    if (config) return path.resolve(cwd, config);
    const local = path.join(cwd, 'ui.config.ts');
    if (existsSync(local)) return local;
    for (let directory = path.resolve(cwd); ; directory = path.dirname(directory)) {
        const file = path.join(directory, 'delba.config.ts');
        if (existsSync(file)) return file;
        if (path.dirname(directory) === directory) return null;
    }
}

/** Load executable TS config and its imports in one isolated session; never serialize callbacks. */
export async function loadProjectConfig(options = {}) {
    // Keep ESM API resolution even when a TS caller reaches this module through require().
    const { register } = await import('tsx/esm/api');
    const { register: registerCommonJs } = await import('tsx/cjs/api');
    if (!registered) {
        // Package exports can cross the namespace boundary; their TS imports still need these hooks.
        registerCommonJs();
        register();
        registered = true;
    }
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const file = resolveConfigFile({ cwd, config: options.config });
    if (!file) return null;
    if (!existsSync(file)) throw new Error(`Configuration does not exist: ${file}`);
    const files = new Set([file]);
    const track = (url) => {
        if (!url.startsWith('file:')) return;
        const imported = fileURLToPath(url);
        if (!imported.includes(`${path.sep}node_modules${path.sep}`)) files.add(imported);
    };
    const namespace = `delba-config-${process.pid}-${++sequence}`;
    const commonJs = registerCommonJs({ namespace });
    const session = register({ namespace, onImport: track });
    const useRequire = commonJsConfig(file);
    const modules = new Map();
    const importModule = async (entry) => {
        const target = path.resolve(path.dirname(file), entry);
        track(pathToFileURL(target).href);
        if (useRequire && modules.has(target)) return modules.get(target);
        return useRequire
            ? commonJs.require(target, file)
            : session.import(pathToFileURL(target).href, import.meta.url);
    };
    const cache = createRequire(import.meta.url).cache;
    const collectRequired = () => {
        const visited = new Set();
        const trackRequired = (module) => {
            if (!module || visited.has(module)) return;
            visited.add(module);
            const file = module.filename.split('?')[0];
            modules.set(file, module.exports);
            track(pathToFileURL(file).href);
            for (const child of module.children) trackRequired(child);
        };
        for (const [key, module] of Object.entries(cache)) {
            if (key.endsWith(`?namespace=${namespace}`)) trackRequired(module);
        }
    };
    const close = async () => {
        if (useRequire) {
            // A failed root import is removed by Node, but its successfully loaded children
            // remain. Collect the session's children on both success and failure.
            collectRequired();
            for (const imported of Object.keys(cache)) {
                if (imported.endsWith(`?namespace=${namespace}`) || files.has(imported))
                    delete cache[imported];
            }
        }
        commonJs.unregister();
        await session.unregister();
    };
    try {
        const loaded = await importModule(file);
        const project = loaded.default?.default ?? loaded.default ?? loaded;
        if (!project || typeof project !== 'object' || Array.isArray(project))
            throw new Error(`${file}: configuration must be an object`);
        const value =
            options.profile && Object.hasOwn(project, options.profile)
                ? project[options.profile]
                : project;
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error(`${file}: selected configuration must be an object`);
        if (value.root !== undefined && (typeof value.root !== 'string' || !value.root.trim()))
            throw new Error(`${file}: root must be a nonempty directory path`);
        const root = value.root === undefined ? cwd : path.resolve(path.dirname(file), value.root);
        collectRequired();
        return { file, project, value, root, files, importModule, close };
    } catch (error) {
        await close();
        throw error;
    }
}
