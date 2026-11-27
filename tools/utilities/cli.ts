#!/usr/bin/env node
/** Standalone utility generation uses delba.config.ts -> delbaFrontend, like the main CLI. */
import fs from 'node:fs';
import path from 'node:path';

import { loadProjectConfig } from '../config-loader.mjs';
import type { FrontendConfig } from '../config';
import { createUtilities, LIB } from './generate';

const args = process.argv.slice(2);
const command = args[0] ?? 'build';

async function main(): Promise<void> {
  if (!['build', 'watch'].includes(command)) throw new Error('Expected build or watch');
  const configIndex = args.indexOf('--config');
  const configArg = configIndex < 0 ? undefined : args[configIndex + 1];
  if (configIndex >= 0 && (!configArg || configArg.startsWith('--')))
    throw new Error('--config requires a delba.config.ts path');
  const cwd = process.cwd();
  const loaded = await loadProjectConfig<FrontendConfig>({
    cwd,
    config: configArg ?? (path.resolve(cwd) === LIB ? null : undefined),
  });
  const root = loaded?.root ?? cwd;
  const config = loaded?.value ?? {};
  const configFiles = loaded ? [...loaded.files] : [];
  await loaded?.close();
  const utilities = createUtilities(root, {
    scan: ['src', path.relative(root, LIB)],
    seeds: { p: Object.values(config.theme?.padding ?? {}) },
    typography: config.typography,
    scale: config.scale,
  });
  const restart = () => process.exit(0);
  if (command === 'watch') {
    // Config fragments have executable imports: restart instead of reusing module caches.
    const watched = new Set(configFiles);
    for (const directory of new Set(configFiles.map(file => path.dirname(file)))) {
      fs.watch(directory, (_event, file) => {
        if (file && watched.has(path.join(directory, String(file)))) restart();
      });
    }
    utilities.watch(restart);
  } else process.exitCode = utilities.build() ? 0 : 1;
}

void main().catch(error => {
  console.error(`[frontend:utilities] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
