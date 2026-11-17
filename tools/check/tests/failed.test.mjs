import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runNodeTests, runSteps } from '../verify.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-failed-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const quiet = { write() {}, progress: () => () => {} };

test('collects independent failures, reruns only failures, and full resets persisted statuses', async (t) => {
  const root = fixture(t);
  const reportFile = path.join(root, 'steps.json');
  const calls = [];
  let fixed = false;
  const steps = ['pass', 'first', 'second'].map((id) => ({ id, name: id, run: ({ failedOnly }) => {
    calls.push([id, failedOnly]);
    return { ok: id === 'pass' || fixed };
  } }));
  assert.equal(await runSteps(steps, { ...quiet, reportFile }), false);
  assert.deepEqual(calls.map(([id]) => id), ['pass', 'first', 'second']);
  fixed = true;
  calls.length = 0;
  const output = [];
  assert.equal(await runSteps(steps, { ...quiet, write: (line) => output.push(line), reportFile, failedOnly: true }), true);
  assert.deepEqual(calls, [['first', true], ['second', true]]);
  assert.equal(JSON.parse(fs.readFileSync(reportFile)).complete, false);
  assert.match(output.at(-1), /требуется полный прогон/);
  assert.equal(await runSteps(steps, { ...quiet, reportFile, failedOnly: true }), false);
  calls.length = 0;
  assert.equal(await runSteps(steps, { ...quiet, reportFile }), true);
  assert.equal(calls.length, 3);
  assert.equal(JSON.parse(fs.readFileSync(reportFile)).complete, true);
});

test('missing or mismatched reports refuse without executing work', async (t) => {
  const reportFile = path.join(fixture(t), 'report.json');
  let calls = 0;
  const steps = [{ name: 'check', run: () => { calls++; return { ok: false }; } }];
  assert.equal(await runSteps(steps, { ...quiet, reportFile, failedOnly: true }), false);
  assert.equal(calls, 0);
  await runSteps(steps, { ...quiet, reportFile, profile: 'one' });
  assert.equal(await runSteps(steps, { ...quiet, reportFile, profile: 'two', failedOnly: true }), false);
  assert.equal(calls, 1);
});

test('failed preparation explicitly blocks dependents while collecting independent failures', async (t) => {
  const reportFile = path.join(fixture(t), 'report.json');
  const calls = [];
  let fixed = false;
  const steps = [
    { id: 'generation', name: 'generation', required: true, run: () => ({ ok: fixed }) },
    { id: 'types', name: 'types', dependsOn: ['generation'], run: ({ failedOnly }) => { calls.push(['types', failedOnly]); return { ok: true }; } },
    { id: 'independent', name: 'independent', run: () => { calls.push(['independent']); return { ok: false }; } },
  ];
  assert.equal(await runSteps(steps, { ...quiet, reportFile }), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportFile)).steps.map((step) => step.status), ['failed', 'blocked', 'failed']);
  assert.deepEqual(calls, [['independent']]);
  fixed = true;
  calls.length = 0;
  assert.equal(await runSteps(steps, { ...quiet, reportFile, failedOnly: true }), false);
  assert.deepEqual(calls, [['types', false], ['independent']]);
});

test('Node reruns failed cases, preserves passing cases, and a final full run resets native state', async (t) => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'probe.test.mjs'), `
    import test from 'node:test'; import fs from 'node:fs';
    test('passing', () => fs.appendFileSync('calls', 'pass\\n'));
    test('failing', () => { fs.appendFileSync('calls', 'fail\\n'); if (!fs.existsSync('fixed')) throw Error('expected'); });
  `);
  const options = { cwd, files: ['*.test.mjs'], stateFile: 'state' };
  assert.equal((await runNodeTests({ ...options, failedOnly: true })).ok, false);
  const first = await runNodeTests(options);
  assert.equal(first.ok, false);
  assert.equal(first.summary.tests, 2);
  fs.writeFileSync(path.join(cwd, 'fixed'), '');
  const next = await runNodeTests({ ...options, failedOnly: true });
  assert.equal(next.ok, true, next.output);
  const native = process.allowedNodeEnvironmentFlags.has('--test-rerun-failures');
  assert.deepEqual(fs.readFileSync(path.join(cwd, 'calls'), 'utf8').trim().split('\n'), native
    ? ['pass', 'fail', 'fail'] : ['pass', 'fail', 'pass', 'fail']);
  assert.equal((await runNodeTests({ ...options, failedOnly: true })).ok, false);
  assert.equal((await runNodeTests(options)).ok, true);
  assert.equal(fs.readFileSync(path.join(cwd, 'calls'), 'utf8').trim().split('\n').length, native ? 5 : 6);
});

test('Node refuses changed file/preload profiles and recovers import, hook and process failures', async (t) => {
  const cwd = fixture(t);
  const source = path.join(cwd, 'probe.test.mjs');
  const options = { cwd, files: ['probe.test.mjs'], stateFile: 'state' };
  for (const broken of [
    'import "./missing.mjs";',
    'import {before,test} from "node:test"; before(()=>{throw Error("hook");}); test("test",()=>{});',
    'process.exit(2);',
  ]) {
    fs.writeFileSync(source, broken);
    assert.equal((await runNodeTests(options)).ok, false);
    assert.equal((await runNodeTests({ ...options, files: ['*.test.mjs'], failedOnly: true })).ok, false);
    assert.equal((await runNodeTests({ ...options, nodeArgs: ['--conditions=other'], failedOnly: true })).ok, false);
    fs.writeFileSync(source, 'import test from "node:test"; test("recovered",()=>{});');
    const result = await runNodeTests({ ...options, failedOnly: true });
    assert.equal(result.ok, true, result.output);
    assert.ok(result.summary.tests > 0);
  }
});
