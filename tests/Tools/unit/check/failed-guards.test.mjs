import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runNodeTests, runSteps } from '../../../../tools/check/verify.mjs';

const quiet = { write() {}, progress: () => () => {} };
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-verify-guards-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('dependency retry repeats passed ancestors and excludes unrelated required preparation', async (t) => {
  const reportFile = path.join(fixture(t), 'report.json');
  const calls = [];
  const steps = [
    { id: 'prepare', name: 'prepare', run: ({ failedOnly }) => { calls.push(['prepare', failedOnly]); return { ok: true }; } },
    { id: 'unrelated', name: 'unrelated', required: true, dependsOn: [], run: () => { calls.push(['unrelated']); return { ok: true }; } },
    { id: 'failure', name: 'failure', dependsOn: ['prepare'], run: ({ failedOnly }) => { calls.push(['failure', failedOnly]); return { ok: false }; } },
  ];
  await runSteps(steps, { ...quiet, reportFile });
  calls.length = 0;
  await runSteps(steps, { ...quiet, reportFile, failedOnly: true });
  assert.deepEqual(calls, [['prepare', false], ['failure', true]]);
});

test('Node rejects missing native state and skipped-only tests, without reporting success', async (t) => {
  const cwd = fixture(t);
  const source = path.join(cwd, 'probe.test.mjs');
  fs.writeFileSync(source, 'import test from "node:test"; test("failed",()=>{throw Error("failure");});');
  const options = { cwd, files: ['probe.test.mjs'], stateFile: 'state' };
  await runNodeTests(options);
  if (process.allowedNodeEnvironmentFlags.has('--test-rerun-failures')) {
    fs.rmSync(path.join(cwd, 'state'));
    const missing = await runNodeTests({ ...options, failedOnly: true });
    assert.equal(missing.ok, false);
    assert.match(missing.output, /state is missing/);
  }
  fs.writeFileSync(source, 'import test from "node:test"; test.skip("failed",()=>{});');
  const empty = await runNodeTests(options);
  assert.equal(empty.ok, false);
  assert.match(empty.output, /no tests/);
});

test('without native reruns only failed files repeat', async (t) => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'pass.test.mjs'), 'import test from "node:test"; import fs from "node:fs"; test("pass",()=>fs.appendFileSync("calls","pass\\n"));');
  fs.writeFileSync(path.join(cwd, 'fail.test.mjs'), 'import test from "node:test"; import fs from "node:fs"; test("fail",()=>{fs.appendFileSync("calls","fail\\n"); if(!fs.existsSync("fixed"))throw Error("failure");});');
  const original = process.allowedNodeEnvironmentFlags;
  process.allowedNodeEnvironmentFlags = new Set([...original].filter((flag) => flag !== '--test-rerun-failures'));
  try {
    const options = { cwd, files: ['*.test.mjs'], stateFile: 'state' };
    assert.equal((await runNodeTests(options)).ok, false);
    fs.writeFileSync(path.join(cwd, 'fixed'), '');
    const retried = await runNodeTests({ ...options, failedOnly: true });
    assert.equal(retried.ok, true, retried.output);
    assert.match(retried.warnings, /only the failed test files/);
    const calls = fs.readFileSync(path.join(cwd, 'calls'), 'utf8').trim().split('\n');
    assert.equal(calls.filter((call) => call === 'pass').length, 1);
    assert.equal(calls.filter((call) => call === 'fail').length, 2);
  } finally {
    process.allowedNodeEnvironmentFlags = original;
  }
});

test('a failure before test discovery explicitly repeats only its failed test step', async (t) => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'probe.test.mjs'), 'import test from "node:test"; test("test",()=>{});');
  const options = { cwd, files: ['probe.test.mjs'], nodeArgs: ['--invalid-verification-option'], stateFile: 'state' };
  const first = await runNodeTests(options);
  assert.equal(first.ok, false);
  assert.equal(first.summary.tests, 0);
  const recovered = await runNodeTests({ ...options, failedOnly: true });
  assert.equal(recovered.ok, false);
  assert.match(recovered.warnings, /failed Node test step in full/);
  assert.equal(recovered.summary.tests, 0);
});

