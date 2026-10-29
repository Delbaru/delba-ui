import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { browserUrl } from './environment';

const require = createRequire(import.meta.url);
const viteCli = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const shellQuote = (value: string) => process.platform === 'win32' ? `"${value}"` : `'${value.replaceAll("'", "'\"'\"'")}'`;
const kitRoot = fileURLToPath(new URL('../..', import.meta.url));
const channel = process.env.PLAYWRIGHT_CHANNEL
  ?? (!process.env.CI && process.platform === 'win32' && !existsSync(chromium.executablePath()) ? 'chrome' : undefined);

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: '.',
  testMatch: ['regressions.spec.ts', 'ssr.spec.ts', 'startup.spec.ts', 'phone-picker.spec.ts', 'collapse-controls.spec.ts', 'text-timeline.spec.ts', 'dropdown-open.spec.ts', 'hover-motion.spec.ts', 'grid-layout.spec.ts', 'link-prefetch.spec.ts', 'duration-picker.spec.ts', 'scrollbar.spec.ts'],
  fullyParallel: true,
  // Local Windows browsers share the desktop resources; keep the complete gate stable there.
  workers: process.platform === 'win32' && !process.env.CI ? 1 : 2,
  reporter: 'line',
  outputDir: '.test-results',
  use: {
    baseURL: browserUrl,
    ...devices['Desktop Chrome'],
    channel,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `node ${shellQuote(viteCli)} --config tools/browser/vite.config.ts --configLoader runner`,
    cwd: kitRoot,
    url: `${browserUrl}/__ui_fixture__`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
