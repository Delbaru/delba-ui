import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { DEFAULT_UI_MESSAGES } from '../../src/core/base/message-defaults';
import { generateMessages, messagesTs, validateMessages } from '../messages';

test('message config rejects unknown keys, malformed labels and missing template parameters', () => {
    validateMessages();
    validateMessages({});
    validateMessages({ validation: { required: 'Required', dateMin: 'After {value}' } });
    for (const json of [
        'null', '[]', '{"locale":"ru"}', '{"input":null}', '{"input":{"typo":"text"}}',
        '{"validation":{"required":false}}', '{"validation":{"email":" "}}',
        '{"validation":{"dateMin":"After"}}', '{"validation":{"dateMin":"After {date}"}}',
        '{"input":{"showPassword":"Show {value}"}}', '{"calendar":{"months":["January"]}}',
        '{"calendar":{"weekdays":["1","2","3","4","5","6",null]}}',
    ]) {
        assert.throws(() => validateMessages(JSON.parse(json)), /messages/);
    }
    assert.throws(() => validateMessages({ calendar: { weekdays: Array(7) } }), /messages.calendar.weekdays\[0\]/);
    assert.throws(() => validateMessages(JSON.parse('{"validation":{"constructor":"bad"}}')), /not supported/);
});

test('message output is complete, safe for literals and repeatable; invalid config never overwrites it', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-messages-output-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const output = path.join(directory, 'messages-config.ts');
    const config = { input: { showPassword: 'Show "password"\nnow' } };
    assert.equal(generateMessages(config, output), true);
    assert.equal(generateMessages(config, output), false);
    const source = fs.readFileSync(output, 'utf8');
    assert.match(source, /Show \\"password\\"\\nnow/);
    assert.ok(source.includes(JSON.stringify(DEFAULT_UI_MESSAGES.validation.required)));
    assert.throws(() => generateMessages(JSON.parse('{"validation":{"dateMin":"missing parameter"}}'), output), /parameters/);
    assert.equal(fs.readFileSync(output, 'utf8'), source);
    assert.match(messagesTs(), /export const MESSAGES_CONFIG = /);
});

test('fresh-checkout fallback and generated messages resolve through the same runtime entry', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-messages-runtime-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
    for (const name of ['fallback', 'configured']) {
        const core = path.join(directory, name, 'core');
        fs.mkdirSync(path.join(core, 'base'), { recursive: true });
        fs.mkdirSync(path.join(core, 'messages-config'));
        for (const file of ['message-defaults.ts', 'messages.ts']) {
            fs.copyFileSync(new URL(`../../src/core/base/${file}`, import.meta.url), path.join(core, 'base', file));
        }
        fs.copyFileSync(new URL('../../src/core/messages-config/index.ts', import.meta.url), path.join(core, 'messages-config/index.ts'));
        if (name === 'configured') generateMessages({ validation: { required: 'Configured required' } }, path.join(core, 'messages-config.ts'));
        const runtime = await import(pathToFileURL(path.join(core, 'base/messages.ts')).href);
        assert.equal(runtime.UI_MESSAGES.validation.required, name === 'fallback' ? DEFAULT_UI_MESSAGES.validation.required : 'Configured required');
        assert.equal(runtime.UI_MESSAGES.validation.time, DEFAULT_UI_MESSAGES.validation.time);
        assert.deepEqual(runtime.UI_MESSAGES.calendar.months, DEFAULT_UI_MESSAGES.calendar.months);
    }
});
