import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { prepareFrontend } from '../module.mjs';
import { registerFrontendSources } from '../registration.mjs';
import { runNode } from './run.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
await registerFrontendSources();
const { starterFrontend } = await import('../visual/starter.ts');
await prepareFrontend({ root, settings: starterFrontend });
const require = createRequire(import.meta.url);
const result = await runNode([
    require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--noEmit', '--incremental', 'false',
], root, { showOutput: true });
if (result.output) console.log(result.output);
process.exitCode = result.ok ? 0 : 1;
