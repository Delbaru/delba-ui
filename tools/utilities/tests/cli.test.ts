import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

test('utility CLI uses the composition root and padding without touching library outputs', context => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-utility-cli-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
  const project = path.join(directory, 'project');
  const nested = path.join(project, 'nested');
  fs.mkdirSync(nested, { recursive: true });
  const cli = path.join(directory, 'cli.ts');
  const loaderUrl = new URL('../../config-loader.mjs', import.meta.url).href;
  const source = fs.readFileSync(new URL('../cli.ts', import.meta.url), 'utf8')
    .replace("from '../config-loader.mjs'", `from '${loaderUrl}'`)
    .replace("from './generate'", "from './generate.ts'");
  fs.writeFileSync(cli, source);
  const capture = path.join(directory, 'captured.json');
  // Replace only output generation; exercise the real CLI argument handling and config loader.
  fs.writeFileSync(path.join(directory, 'generate.ts'), `
    import fs from 'node:fs';
    export const LIB = ${JSON.stringify(fileURLToPath(new URL('../../..', import.meta.url)))};
    export function createUtilities(root, config) {
      fs.writeFileSync(${JSON.stringify(capture)}, JSON.stringify({ root, config }));
      return { build: () => true };
    }
  `);
  const execute = (...args: string[]) => spawnSync(process.execPath,
    ['--import', pathToFileURL(require.resolve('tsx')).href, cli, 'build', ...args],
    { cwd: nested, encoding: 'utf8' });
  const delbaFrontend = {
    theme: { sources: ['src/theme'], padding: { field: [8, 12], panel: [1, 2, 3, 4], none: 0 } },
    typography: ['p1'],
  };
  fs.writeFileSync(path.join(project, 'delba.config.ts'), `export default ${JSON.stringify({ delbaFrontend })};`);
  const success = execute();
  assert.equal(success.status, 0, success.stderr);
  const generated = JSON.parse(fs.readFileSync(capture, 'utf8'));
  assert.equal(generated.root, project);
  assert.deepEqual(generated.config.seeds, { p: [[8, 12], [1, 2, 3, 4], 0] });
  assert.deepEqual(generated.config.typography, ['p1']);
  fs.rmSync(capture);
  const legacy = execute('--config', '../utilities.config.ts');
  assert.notEqual(legacy.status, 0);
  assert.match(legacy.stderr, /delba.config.ts/);
  assert.equal(fs.existsSync(capture), false);
  fs.writeFileSync(path.join(project, 'delba.config.ts'), 'export default { scan: ["src"], seeds: {} };');
  const direct = execute();
  assert.notEqual(direct.status, 0);
  assert.match(direct.stderr, /delbaFrontend/);
  assert.equal(fs.existsSync(capture), false);
});
