import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, type Plugin } from 'vite';
import { resolveScale, scaleCss } from '../../src/core/base/scale';
import { renderRules } from '../../src/core/utilities/rules';
import { extractUtilityRules } from '../utilities/extract';
import { ssrPlugin } from './ssr-plugin';

const kitRoot = fileURLToPath(new URL('../..', import.meta.url));
const fixtureRoot = fileURLToPath(new URL('.', import.meta.url));
const fixtureFile = path.join(fixtureRoot, 'fixture.tsx');
const ssrFixtureFile = path.join(fixtureRoot, 'ssr-fixture.tsx');
const virtualUtilityId = '\0browser-utilities.css';

const fixtureUtilities: Plugin = {
  name: 'browser-fixture-utilities',
  resolveId(id) {
    return id === 'virtual:browser-utilities.css' ? virtualUtilityId : undefined;
  },
  load(id) {
    if (id !== virtualUtilityId) return undefined;
    const rules = extractUtilityRules([
      { file: fixtureFile, text: fs.readFileSync(fixtureFile, 'utf8') },
      { file: ssrFixtureFile, text: fs.readFileSync(ssrFixtureFile, 'utf8') },
      { file: path.join(kitRoot, 'src/components/GradientBorder/GradientBorder.tsx'), text: fs.readFileSync(path.join(kitRoot, 'src/components/GradientBorder/GradientBorder.tsx'), 'utf8') },
    ]);
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
  esbuild: {
    jsx: 'automatic',
  },
  define: {
    'process.env': '{}',
  },
  server: {
    host: '127.0.0.1',
    port: 4178,
    strictPort: true,
  },
});
