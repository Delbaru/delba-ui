import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { runNode } from './run.mjs';

export { runNode, runSteps } from './run.mjs';

const reporter = new URL('./reporter.mjs', import.meta.url).href;
const hash = (value) => createHash('sha256').update(value).digest('hex');

/** Node test invocation with native failed-case reruns, or failed-file reruns on Node 22. */
export async function runNodeTests({ cwd = process.cwd(), files, nodeArgs = [], stateFile, failedOnly = false }) {
  const root = path.resolve(cwd);
  const file = stateFile ? path.resolve(root, stateFile) : null;
  const metadata = file && `${file}.json`;
  const native = process.allowedNodeEnvironmentFlags.has('--test-rerun-failures');
  const identity = hash(JSON.stringify({ cwd: root, files, nodeArgs, node: process.versions.node }));
  const fail = (output) => ({ ok: false, output });
  if (!Array.isArray(files) || files.length === 0) return fail('Node tests require an explicit nonempty files list.');
  if (nodeArgs.some((arg) => /^--test(?:=|$|-reporter|-rerun-failures)/.test(arg))) {
    return fail('runNodeTests owns --test, reporters and rerun state; nodeArgs contains a managed option.');
  }
  let previous;
  let repeatStep = false;
  if (failedOnly) {
    if (!file) return fail('--failed requires stateFile.');
    try {
      previous = JSON.parse(fs.readFileSync(metadata, 'utf8'));
      if (previous.version !== 1 || previous.identity !== identity) return fail('--failed Node test state does not match this profile.');
      if (previous.ok) return fail('No failed Node tests are recorded; run the final full profile.');
      if (!Array.isArray(previous.failedFiles)) return fail('--failed Node metadata is invalid.');
      repeatStep = previous.failedFiles.length === 0;
      if (native && !repeatStep && (!fs.existsSync(file) || previous.stateHash !== hash(fs.readFileSync(file)))) {
        return fail('--failed native Node state is missing or has changed.');
      }
    } catch {
      return fail('--failed requires matching previous Node test state.');
    }
  }
  const temporary = file ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'delba-ui-tests-'));
  const eventsFile = file ? `${file}.events.json` : path.join(temporary, 'events.json');
  if (file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!failedOnly || repeatStep) for (const target of [file, metadata, eventsFile]) fs.rmSync(target, { force: true });
  }
  const selectedFiles = failedOnly && !native && !repeatStep ? previous.failedFiles : files;
  const reporting = new URL(reporter);
  if (eventsFile) reporting.searchParams.set('state', eventsFile);
  const result = await runNode([
    ...nodeArgs, '--test', ...(native && file ? [`--test-rerun-failures=${file}`] : []),
    '--test-reporter', reporting.href,
    ...selectedFiles,
  ], root);
  let events;
  try {
    events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
  } catch {
    events = { tests: 0, failedFiles: [] };
  }
  if (result.ok && events.tests === 0) {
    result.ok = false;
    result.output = 'Node ran no tests; this is not a successful verification.';
  }
  const notice = failedOnly && repeatStep
    ? 'No failed test file was reported; repeated the failed Node test step in full.'
    : failedOnly && !native ? 'Native case reruns are unavailable; repeated only the failed test files.' : '';
  if (notice) {
    result.warnings = [notice, result.warnings].filter(Boolean).join('\n');
    if (!result.ok) result.output = [notice, result.output].filter(Boolean).join('\n');
  }
  if (file) {
    fs.writeFileSync(metadata, JSON.stringify({ version: 1, identity, ok: result.ok,
      failedFiles: events.failedFiles, stateHash: native && fs.existsSync(file) ? hash(fs.readFileSync(file)) : null,
    }, null, 2) + '\n');
  }
  fs.rmSync(eventsFile, { force: true });
  if (temporary) fs.rmdirSync(temporary);
  return { ...result, summary: { tests: events.tests, failedFiles: events.failedFiles.length } };
}
