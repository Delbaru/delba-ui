import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkImportBoundaries, checkTestPlacement } from '@delba/eslint';

function put(root, name, content = '') {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

test('shared boundary analysis covers FSD, server, dynamic, fetch and runtime-to-test imports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'delba-eslint-boundaries-'));
    try {
        put(root, 'src/widgets/Chat/ui/Room.tsx', `import Inbox from '@/views/Inbox';
import server from '../../../crm/server/router';
import fixture from '../../../../tests/Domain/unit/view.test';
const lazy = import(moduleName);
const required = require(moduleName);
const alsoRequired = module.require(moduleName);
const explicit = module.require('../../../crm/server/router');
fetch('/api/messages');
const directFetch = window.fetch;
const computedFetch = globalThis['fetch'];
const loader = createRequire(import.meta.url);
export { value } from '../../../crm/gateway';
`);
        const issues = checkImportBoundaries(root, { dirs: ['src'], mode: 'consumer' });
        assert.ok(issues.some(issue => /never up/.test(issue.message)));
        assert.ok(issues.some(issue => /Server implementation/.test(issue.message)));
        assert.ok(issues.some(issue => /tests|fixtures/.test(issue.message)));
        assert.ok(issues.some(issue => /Dynamic import/.test(issue.message)));
        assert.ok(issues.some(issue => /require\(\)/.test(issue.message)));
        assert.equal(issues.filter(issue => /network requests/.test(issue.message)).length, 3);
        assert.ok(issues.length >= 12);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('shared placement analysis checks each owning checkout separately', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'delba-eslint-placement-'));
    try {
        for (const name of [
            'src/Field/value.test.ts',
            'src/Field/types.type-test.ts',
            'examples/domain/tests/probe.test.mjs',
            'tests/Field/unit/value.test.ts',
            'tools/check/tests/example.spec.ts',
            'nested-kit/.git',
            'nested-kit/tests/Field/unit/value.test.ts',
            '.next-check/generated/example.test.js',
            'node_modules/example/index.test.js',
        ]) put(root, name);
        assert.deepEqual(checkTestPlacement(root), [
            'examples/domain/tests/probe.test.mjs',
            'src/Field/types.type-test.ts',
            'src/Field/value.test.ts',
            'tools/check/tests/example.spec.ts',
        ]);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
