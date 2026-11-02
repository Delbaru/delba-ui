import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { defineConfig, type Plugin } from 'vite';
import { resolveScale, scaleCss } from '../../src/core/base/scale';
import { renderRules } from '../../src/core/utilities/rules';
import { extractUtilityRules } from '../utilities/extract';
import { ssrPlugin } from './ssr-plugin';
import { browserPort } from './environment';

const kitRoot = fileURLToPath(new URL('../..', import.meta.url));
const fixtureRoot = fileURLToPath(new URL('.', import.meta.url));
const fixtureFile = path.join(fixtureRoot, 'fixture.tsx');
const ssrFixtureFile = path.join(fixtureRoot, 'ssr-fixture.tsx');
const virtualUtilityId = '\0browser-utilities.css';

let cachedRules: ReturnType<typeof extractUtilityRules> = [];
let cachedSources = '';

function componentFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'tests' ? [] : componentFiles(file);
    return entry.name.endsWith('.tsx') ? [file] : [];
  });
}

function fixtureRules() {
  const files = [
    fixtureFile,
    ssrFixtureFile,
    ...fs.readdirSync(fixtureRoot).filter(name => name.endsWith('.fixture.tsx')).map(name => path.join(fixtureRoot, name)),
    ...componentFiles(path.join(kitRoot, 'src/components')),
  ];
  const sources = files.map(file => {
    const stat = fs.statSync(file);
    return file + ':' + stat.mtimeMs + ':' + stat.size;
  }).join('\n');
  if (sources !== cachedSources) {
    cachedRules = extractUtilityRules(files.map(file => ({ file, text: fs.readFileSync(file, 'utf8') })));
    cachedSources = sources;
  }
  return cachedRules;
}

const fixtureUtilities: Plugin = {
  name: 'browser-fixture-utilities',
  resolveId(id) {
    return id === 'virtual:browser-utilities.css' ? virtualUtilityId : undefined;
  },
  load(id) {
    if (id !== virtualUtilityId) return undefined;
    const rules = fixtureRules();
    return `${renderRules(rules)}\n${scaleCss(resolveScale())}`;
  },
};

export default defineConfig({
  root: fixtureRoot,
  plugins: [fixtureUtilities, ssrPlugin],
  resolve: {
    alias: {
      '@delba/ui': kitRoot,
      'next/image': fileURLToPath(new URL('./next-image.tsx', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        // A consumer may generate a different field-height list in the shared checkout.
        // Configure Sass for this fixture without overwriting the consumer's generated file.
        additionalData(source: string) {
          const heights = [...new Set(fixtureRules()
            .filter((rule) => rule.utility.name === 'h')
            .map((rule) => rule.entry)
            .filter((entry): entry is number => typeof entry === 'number' && Number.isInteger(entry) && entry >= 0))];
          const module = pathToFileURL(path.join(kitRoot, 'src/core/_field-sizes.scss')).href;
          return `@use "${module}" as fixture_field_sizes with ($height-values: (${heights.join(', ')}));\n${source.replace(/^\uFEFF/, '')}`;
        },
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  define: {
    'process.env': '{}',
  },
  server: {
    host: '127.0.0.1',
    port: browserPort,
    strictPort: true,
  },
});
