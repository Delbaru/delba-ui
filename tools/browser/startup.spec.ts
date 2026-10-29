import { expect, test, type Page } from '@playwright/test';
import { pageReadyScript } from '../../src/startup';

const pendingFonts = `window.__fontWait = new Promise((resolve,reject)=>{window.__resolveFonts=resolve;window.__rejectFonts=reject;});
window.__fontWait.catch(()=>{});Object.defineProperty(document.fonts,'ready',{get:()=>window.__fontWait});`;

async function installStartup(page: Page, timeoutMs: number) {
  await page.route('**/ssr', async route => {
    const response = await route.fetch();
    const html = await response.text();
    expect(html).toContain('<head>');
    await route.fulfill({ response, body: html.replace('<head>', `<head><link rel="stylesheet" href="/styles.scss?direct"><script>${pendingFonts}${pageReadyScript({ timeoutMs })}</script>`) });
  });
}

test('page preparation waits for fonts, pauses entrance motion and does not restart after ready', async ({ page }) => {
  await installStartup(page, 10000);
  await page.goto('/ssr');
  await expect(page.locator('html')).toHaveAttribute('data-ui-loading', '');
  await expect(page.locator('body')).toHaveCSS('opacity', '0');
  await expect(page.locator('html')).toHaveAttribute('inert', '');
  await page.addStyleTag({ content: '@keyframes startup-probe {to {opacity:.5}} #startup-probe {animation:startup-probe 10s linear infinite}' });
  await page.evaluate(() => { const el = document.createElement('div'); el.id = 'startup-probe'; document.body.append(el); });
  await expect(page.locator('#startup-probe')).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate('window.__resolveFonts()');
  await expect(page.locator('html')).toHaveAttribute('data-ui-ready', 'fonts');
  await expect(page.locator('body')).toHaveCSS('opacity', '1');
  await expect(page.locator('html')).not.toHaveAttribute('inert');
  await expect(page.locator('#startup-probe')).toHaveCSS('animation-play-state', 'running');
  await page.evaluate(pageReadyScript());
  await expect(page.locator('html')).not.toHaveAttribute('data-ui-loading');
});

test('stalled font preparation fails open at the deadline and records a diagnostic', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  await installStartup(page, 200);
  await page.goto('/ssr');
  await expect(page.locator('html')).toHaveAttribute('data-ui-ready', 'timeout');
  await expect(page.locator('body')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('body')).toHaveCSS('opacity', '1');
  expect(warnings).toContain('[ui] Page ready fallback: timeout');
});

test('font errors release the page rather than keeping it hidden', async ({ page }) => {
  await installStartup(page, 10000);
  await page.goto('/ssr');
  await page.waitForTimeout(100);
  await page.evaluate('window.__rejectFonts(new Error("font unavailable"))');
  await expect(page.locator('html')).toHaveAttribute('data-ui-ready', 'font-error');
  await expect(page.locator('body')).toHaveCSS('opacity', '1');
});

test('without JavaScript the server page remains readable with startup styles loaded', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await installStartup(page, 200);
    await page.goto('/ssr');
    await expect(page.locator('html')).not.toHaveAttribute('data-ui-loading');
    await expect(page.locator('body')).toHaveCSS('visibility', 'visible');
    await expect(page.locator('body')).toHaveCSS('opacity', '1');
    await expect(page.getByTestId('ssr-input')).toBeVisible();
  } finally {
    await context.close();
  }
});
