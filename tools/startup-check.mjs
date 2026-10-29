import fs from 'node:fs';

export function assertRenderedFont(selector, family, actual) {
  const normalize = text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (!actual.some(font => font.isCustomFont && normalize(font.familyName).includes(normalize(family)))) {
    throw new Error(`${selector}: expected custom ${family}; rendered ${actual.map(font => font.familyName).join(', ') || 'no text glyphs'}`);
  }
}

/** Read-only production audit. The caller starts the correct app before supplying its URL. */
export async function checkStartup(argv) {
  const value = name => argv[argv.indexOf(name) + 1];
  if (!argv.includes('--url')) throw new Error('Usage: delba-ui startup --url <running production URL> [--font "selector=family"] [--max-cls 0.001]');
  const url = new URL(value('--url'));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP(S) URL without credentials');
  const maxCls = argv.includes('--max-cls') ? Number(value('--max-cls')) : 0.001;
  if (!Number.isFinite(maxCls) || maxCls < 0) throw new Error('Invalid --max-cls');
  const fonts = argv.flatMap((arg, index) => {
    if (arg !== '--font') return [];
    const pair = argv[index + 1] ?? '';
    const separator = pair.indexOf('=');
    if (separator < 1 || !pair.slice(separator + 1).trim()) throw new Error('Use --font "selector=family"');
    return [{ selector: pair.slice(0, separator), family: pair.slice(separator + 1) }];
  });
  const { chromium } = await import('@playwright/test');
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' && !fs.existsSync(chromium.executablePath()) ? 'chrome' : undefined);
  const browser = await chromium.launch({ channel, headless: true });
  const rows = [];
  const failures = [];
  try {
    for (const width of [390, 1440]) {
      for (const mode of ['cold', 'font-delay', 'js-delay', 'no-js']) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no-js' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        if (mode === 'font-delay' || mode === 'js-delay') {
          await page.route(mode === 'font-delay' ? '**/*.woff2*' : '**/*.js*', async route => {
            await new Promise(resolve => setTimeout(resolve, 700));
            await route.continue();
          });
        }
        await page.addInitScript(() => {
          window.__uiStartupCls = 0;
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__uiStartupCls += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
        });
        try {
          const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
          if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
          await page.waitForFunction(() => !document.documentElement.hasAttribute('data-ui-loading'), undefined, { timeout: 5000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(1800);
          const state = await page.evaluate(() => ({
            ready: document.documentElement.dataset.uiReady ?? 'not-configured',
            cls: window.__uiStartupCls ?? null,
            visible: Number(getComputedStyle(document.body).opacity) > 0 && getComputedStyle(document.body).visibility === 'visible' && getComputedStyle(document.body).display !== 'none' && !document.documentElement.inert,
            emptyIcons: [...document.querySelectorAll('header svg.ui-icon')].filter(el => !el.innerHTML.trim()).length,
          }));
          if (!state.visible) throw new Error('Page remains hidden or inert');
          if (['timeout', 'font-error'].includes(state.ready)) throw new Error(`Preparation ended with ${state.ready}`);
          if (state.emptyIcons) throw new Error(`${state.emptyIcons} empty header icons in ${mode}`);
          if (state.cls !== null && state.cls > maxCls) throw new Error(`Startup CLS ${state.cls} exceeds ${maxCls}`);
          await cdp.send('DOM.enable');
          await cdp.send('CSS.enable');
          const { root } = await cdp.send('DOM.getDocument');
          const renderedFonts = [];
          for (const expected of fonts) {
            const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: expected.selector });
            if (!nodeId) throw new Error(`Font target missing: ${expected.selector}`);
            const { fonts: actual } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
            assertRenderedFont(expected.selector, expected.family, actual);
            renderedFonts.push({ selector: expected.selector, families: actual.map(font => font.familyName) });
          }
          if (errors.length) throw new Error(errors.join('\n'));
          rows.push({ width, mode, ...state, renderedFonts });
        } catch (error) {
          failures.push(`${width}px ${mode}: ${error instanceof Error ? error.message : error}`);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ url: `${url.origin}${url.pathname}`, rows, failures }, null, 2));
  if (failures.length) throw new Error(`Startup audit failed in ${failures.length} scenario(s)`);
  return true;
}
