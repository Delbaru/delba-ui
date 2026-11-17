import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { runBrowserTests } from '../index.mjs';
import { runNodeTests } from '../verify.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-retry-review-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('stateless Node runs reject skipped-only selections and report actual counts', async (t) => {
  const cwd = fixture(t);
  const source = path.join(cwd, 'probe.test.mjs');
  fs.writeFileSync(source, 'import test from "node:test"; test.skip("skip",()=>{});');
  const empty = await runNodeTests({ cwd, files: ['probe.test.mjs'] });
  assert.equal(empty.ok, false);
  assert.match(empty.output, /no tests/);
  assert.equal(empty.summary.tests, 0);
  fs.writeFileSync(source, 'import assert from "node:assert/strict"; assert.equal(1,1);');
  const fileTest = await runNodeTests({ cwd, files: ['probe.test.mjs'] });
  assert.equal(fileTest.ok, true, fileTest.output);
  assert.equal(fileTest.summary.tests, 1, 'Node treats top-level assertion files as one test');
});

for (const failedOnly of [false, true]) {
  test(`early Playwright runner failure never attests stale state (${failedOnly ? 'retry' : 'full'})`, async (t) => {
    const root = fixture(t);
    const reportFile = path.join(root, 'report.json');
    const state = path.join(root, 'tools/browser/.test-results/.last-run.json');
    const receipt = `${reportFile}.browser-state.json`;
    fs.mkdirSync(path.dirname(state), { recursive: true });
    fs.writeFileSync(state, JSON.stringify({ status: 'failed', failedTests: ['stale-case'] }));
    fs.writeFileSync(receipt, JSON.stringify({ hash: createHash('sha256').update(fs.readFileSync(state)).digest('hex') }));
    const result = await runBrowserTests({ root, reportFile, failedOnly });
    assert.equal(result.ok, false);
    assert.match(result.output, /playwright.config.ts/);
    assert.equal(fs.existsSync(receipt), false);
    if (!failedOnly) assert.equal(fs.existsSync(state), false);
    const retry = await runBrowserTests({ root, reportFile, failedOnly: true });
    assert.equal(retry.ok, false);
    assert.match(retry.output, /requires.*Playwright state/);
  });
}
