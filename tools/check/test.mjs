import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { discoverTests } from './discovery.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = discoverTests(root, ['tools', 'tests']);
if (!files.length) throw new Error('No library tests discovered.');
const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--import', './tools/check/unit-runtime.mjs', '--test', ...files,
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
