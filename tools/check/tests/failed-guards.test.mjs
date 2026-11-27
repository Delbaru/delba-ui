import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { uiCheckSteps } from '../index.mjs';
import { runNodeTests, runSteps } from '../verify.mjs';

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

test('Playwright failed-only refuses absent state instead of launching a browser or a full suite', async (t) => {
  const reportFile = path.join(fixture(t), 'report.json');
  const browser = uiCheckSteps({ suite: 'browser', reportFile }).find((step) => step.name === 'Браузер');
  const result = await browser.run({ failedOnly: true });
  assert.equal(result.ok, false);
  assert.match(result.output, /requires.*Playwright state/);
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

test('configured project with empty discovery fails, unconfigured project keeps no test step', async (t) => {
  const project = fixture(t);
  const getStep = config => uiCheckSteps({ project, suite: 'project', config })
    .find(step => step.name === 'Тесты проекта');
  assert.equal(getStep({}), undefined);
  const step = getStep({ testConcurrency: 1 });
  assert.ok(step);
  const result = await step.run();
  assert.equal(result.ok, false);
  assert.match(result.output, /nonempty files list/);
});

test('CRM project delegates the root plan and native guard before starting any worker', async (t) => {
  const project = fixture(t);
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: 'delba-os',
    scripts: { 'test:root': 'node tools/verification/run.mjs root' } }));
  fs.mkdirSync(path.join(project, 'tools', 'verification'), { recursive: true });
  fs.mkdirSync(path.join(project, 'tests'));
  // Mock the owning CLI; OS profiles.test.mjs exercises the real guard separately.
  fs.writeFileSync(path.join(project, 'tools', 'verification', 'run.mjs'), `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    assert.deepEqual(process.argv.slice(2), ['root', '--list-files']);
    fs.appendFileSync('planned', process.env.CRM_QA_DB_TESTS + '\\n');
    if (process.env.CRM_QA_DB_TESTS === '1' && process.env.DATABASE_URL !== 'postgresql://localhost/crm_qa') {
      console.error('DATABASE_URL rejected by owner'); process.exitCode = 1;
    } else console.log(JSON.stringify(['tests/probe.test.ts']));
  `);
  fs.writeFileSync(path.join(project, 'tests', 'probe.test.ts'), `
    import test from 'node:test';
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    enum NativeFlag { Enabled = '1' }
    test('native environment and worker options', () => {
      assert.equal(process.env.CRM_QA_DB_TESTS, NativeFlag.Enabled);
      assert.ok(process.execArgv.includes('--conditions=crm-probe'));
      assert.ok(process.execArgv.includes('--test-concurrency=1'));
      fs.appendFileSync('ran', 'yes');
    });
    test.skip('native scenario not exercised by mock', () => { throw Error('must not run'); });
  `);
  // Restore the test process environment; the mock CLI and worker never contact a database.
  const original = Object.fromEntries(['CRM_QA_DB_TESTS', 'CRM_QA_DATABASE', 'DATABASE_URL']
    .map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const step = () => uiCheckSteps({ project, suite: 'project',
    config: { testConcurrency: 4, testConditions: ['crm-probe'] } })
    .find(item => item.name === 'Тесты проекта');
  process.env.CRM_QA_DB_TESTS = '1';
  process.env.CRM_QA_DATABASE = 'crm_qa';
  process.env.DATABASE_URL = 'postgresql://remote/crm_qa';
  const guard = uiCheckSteps({ project, suite: 'project' })[0];
  assert.equal(guard.name, 'План тестов CRM');
  assert.equal(guard.required, true);
  const rejected = await guard.run();
  assert.equal(rejected.ok, false);
  assert.match(rejected.output, /DATABASE_URL rejected by owner/);
  assert.equal(fs.existsSync(path.join(project, 'ran')), false);
  process.env.DATABASE_URL = 'postgresql://localhost/crm_qa';
  const accepted = await step().run();
  assert.equal(accepted.ok, true, accepted.output);
  assert.match(accepted.output, /1 passed, 0 failed, 1 skipped/);
  assert.equal(fs.readFileSync(path.join(project, 'ran'), 'utf8'), 'yes');
  assert.equal(fs.readFileSync(path.join(project, 'planned'), 'utf8'), '1\n1\n');
});

test('missing preload and mismatched failed state cannot report a successful retry', async (t) => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'probe.test.mjs'), 'import test from "node:test"; test("probe",()=>{});');
  const options = { cwd, files: ['probe.test.mjs'], stateFile: 'state',
    nodeArgs: ['--import', './missing-preload.mjs'] };
  const failure = await runNodeTests(options);
  assert.equal(failure.ok, false);
  assert.match(failure.output, /missing-preload/);
  const mismatch = await runNodeTests({ ...options, nodeArgs: [], failedOnly: true });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.output, /does not match this profile/);
});
