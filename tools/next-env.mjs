import { createRequire } from 'node:module';
import path from 'node:path';

// Resolve from the host Next package so resetEnv touches Next's actual singleton.
const hostRequire = createRequire(path.join(process.cwd(), 'package.json'));
const nextRequire = createRequire(hostRequire.resolve('next/package.json'));
const nextEnvironment = nextRequire('@next/env');

/** Adapt an already selected host environment to native Next. Never read ENV/config files. */
export function prepareNextEnvironment(env = process.env) {
    const selected = { ...env };
    let projection;
    try { projection = JSON.parse(selected.DELBA_PUBLIC_ENV ?? '{}'); }
    catch { throw new Error('DELBA_PUBLIC_ENV must be scalar JSON'); }
    if (!projection || typeof projection !== 'object' || Array.isArray(projection))
        throw new Error('DELBA_PUBLIC_ENV must be a scalar dictionary');
    for (const [name, value] of Object.entries(projection)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || /^(?:NODE_|__)/.test(name) || name === 'NEXT_RUNTIME' ||
            (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) ||
            (typeof value === 'number' && !Number.isFinite(value)))
            throw new Error(`Invalid public environment value: ${name}`);
    }
    for (const [name, value] of Object.entries(selected)) {
        if (name.startsWith('NEXT_PUBLIC_') && value !== undefined && !Object.hasOwn(projection, name))
            throw new Error(`${name} is absent from the module public projection`);
    }
    for (const [name, value] of Object.entries(projection)) selected[name] = String(value);
    selected.__NEXT_PROCESSED_ENV = 'true';
    // processEnv initializes initialEnv without invoking loadEnvConfig's dotenv discovery.
    nextEnvironment.processEnv([], undefined);
    const replacement = Object.fromEntries(Object.keys(nextEnvironment.initialEnv ?? {}).map(name => [name, undefined]));
    Object.assign(replacement, selected);
    nextEnvironment.updateInitialEnv(replacement);
    nextEnvironment.resetEnv();
    return projection;
}
