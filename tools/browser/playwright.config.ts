import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const kitRoot = fileURLToPath(new URL('../..', import.meta.url));
const channel = process.env.PLAYWRIGHT_CHANNEL
  ?? (!process.env.CI && process.platform === 'win32' && !existsSync(chromium.executablePath()) ? 'chrome' : undefined);

export default defineConfig({
  testDir: '.',
  testMatch: ['regressions.spec.ts', 'ssr.spec.ts', 'phone-picker.spec.ts', 'collapse-controls.spec.ts', 'text-timeline.spec.ts', 'duration-picker.spec.ts'],
  fullyParallel: true,
  // Local Windows browsers share the desktop resources; keep the complete gate stable there.
  workers: process.platform === 'win32' && !process.env.CI ? 1 : 2,
  reporter: 'line',
  outputDir: '.test-results',
  use: {
    baseURL: 'http://127.0.0.1:4178',
    ...devices['Desktop Chrome'],
    channel,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config tools/browser/vite.config.ts --configLoader runner',
    cwd: kitRoot,
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
