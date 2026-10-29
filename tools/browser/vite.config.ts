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

function fixtureRules() {
  return extractUtilityRules([
      { file: fixtureFile, text: fs.readFileSync(fixtureFile, 'utf8') },
      { file: ssrFixtureFile, text: fs.readFileSync(ssrFixtureFile, 'utf8') },
      ...['hover-motion.fixture.tsx', 'dropdown-open.fixture.tsx', 'grid-layout.fixture.tsx'].map((name) => {
        const file = path.join(fixtureRoot, name);
        return { file, text: fs.readFileSync(file, 'utf8') };
      }),
      { file: path.join(fixtureRoot, 'refactor-contracts.fixture.tsx'), text: fs.readFileSync(path.join(fixtureRoot, 'refactor-contracts.fixture.tsx'), 'utf8') },
      { file: path.join(kitRoot, 'src/components/DurationPicker/DurationPicker.tsx'), text: fs.readFileSync(path.join(kitRoot, 'src/components/DurationPicker/DurationPicker.tsx'), 'utf8') },
      { file: path.join(kitRoot, 'src/components/GradientBorder/GradientBorder.tsx'), text: fs.readFileSync(path.join(kitRoot, 'src/components/GradientBorder/GradientBorder.tsx'), 'utf8') },
    ]);
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
