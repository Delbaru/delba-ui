import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';

import { formatProgress, formatStep } from '../../../../tools/check/format.mjs';
import { startProgress } from '../../../../tools/check/progress.mjs';
import { discoverTests, projectSteps, uiCheckSteps } from '../../../../tools/check/index.mjs';
import { runNode, runSteps } from '../../../../tools/check/run.mjs';

test('library suites own units and fixtures; consumer execution is rejected', () => {
    const names = uiCheckSteps({ suite: 'all' }).map((step: { name: string }) => step.name);
    assert.equal(names.length, 6);
    assert.throws(() => uiCheckSteps({ project: '/consumer' }), /Unsupported/);
    assert.throws(() => uiCheckSteps({ suite: 'project' }), /Unknown UI suite/);
});

test('ошибка и исключение не скрывают остальные результаты и делают общий итог красным', async () => {
    const output: string[] = [];
    const ok = await runSteps([
        { name: 'Типы', run: async () => ({ ok: false, output: 'Panel.tsx:4: ошибка типов' }) },
        { name: 'Границы', run: () => { throw new Error('Файл недоступен'); } },
        { name: 'Тесты', run: async () => ({ ok: true }) },
    ], { write: (line: string) => output.push(line), color: false });
    assert.equal(ok, false);
    assert.match(output.join('\n'), /Panel.tsx:4: ошибка типов/);
    assert.match(output.join('\n'), /Файл недоступен/);
    assert.match(output[2] ?? '', /^✓ Тесты \(\d+\.\d с\)$/);
    assert.match(output[3] ?? '', /^\n✗ UI — проверка не пройдена \(\d+\.\d с\)$/);
});

test('неудачная подготовка и остановленный процесс прекращают следующие шаги', async () => {
    for (const first of [
        { required: true, run: async () => ({ ok: false }) },
        { run: async () => ({ ok: false, signal: 'SIGINT' }) },
    ]) {
        let nextRan = false;
        assert.equal(await runSteps([
            { name: 'Подготовка', ...first },
            { name: 'Следующий шаг', run: async () => { nextRan = true; return { ok: true }; } },
        ], { write: () => {}, color: false }), false);
        assert.equal(nextRan, false);
    }
});

test('parallel checks wait for generation, respect their bound and collect both failures', async () => {
    let prepared = false;
    let active = 0;
    let peak = 0;
    const output: string[] = [];
    const failed = () => ({ name: 'Independent', run: async () => {
        assert.equal(prepared, true);
        active++; peak = Math.max(peak, active);
        await new Promise(resolve => setTimeout(resolve, 10));
        active--;
        return { ok: false, output: 'failure' };
    } });
    const ok = await runSteps([
        { name: 'Generation', required: true, run: () => { prepared = true; return { ok: true }; } },
        failed(), failed(), failed(),
    ], { concurrency: 2, write: (line: string) => output.push(line), color: false });
    assert.equal(ok, false);
    assert.equal(peak, 2);
    assert.equal(output.filter(line => line.includes('failure')).length, 3);
    await assert.rejects(runSteps([], { concurrency: 3 }), /checkConcurrency/);
});

test('дочерний процесс: stdout успеха скрыт, предупреждения сохранены, ненулевой код означает ошибку', async () => {
    const success = await runNode(['-e', 'console.log("лишний лог"); console.warn("\\x1b[33mпредупреждение\\x1b[0m");'], process.cwd());
    assert.equal(success.ok, true);
    assert.equal(success.output, '');
    assert.equal(success.warnings, 'предупреждение');
    const failure = await runNode(['-e', 'console.log("\\x1b[31mместо ошибки\\x1b[0m"); process.exitCode = 7;'], process.cwd());
    assert.equal(failure.ok, false);
    assert.match(failure.output, /место ошибки/);
    assert.match(failure.output, /Код завершения: 7/);
    assert.equal(failure.output.includes('\u001b'), false);
    const unavailable = await runNode(['-e', ''], `${process.cwd()}/__missing_check_directory__`);
    assert.equal(unavailable.ok, false);
    assert.ok(unavailable.output);
});

test('короткие статусы: зелёный успех, красная ошибка, жёлтое предупреждение; без цвета по умолчанию', () => {
    assert.equal(formatStep('Типы', { ok: true }), '✓ Типы');
    assert.equal(formatStep('Тесты', { ok: true, durationMs: 12345 }), '✓ Тесты (12.3 с)');
    assert.equal(formatStep('Типы', { ok: false, output: 'ошибка', durationMs: 0 }), '✗ Типы (0.0 с)\n  ошибка');
    assert.equal(formatStep('Типы', { ok: false, output: 'ошибка' }), '✗ Типы\n  ошибка');
    assert.equal(formatStep('Типы', { ok: true }, { color: true }), '\u001b[32m✓\u001b[0m Типы');
    assert.equal(formatStep('Типы', { ok: false }, { color: true }), '\u001b[31m✗\u001b[0m Типы');
    assert.equal(formatStep('Типы', { ok: true, warnings: 'предупреждение' }, { color: true }), '\u001b[33m⚠\u001b[0m Типы\n  предупреждение');
    assert.equal(formatProgress('Типы', '⠋', { color: true }), '\u001b[36m⠋\u001b[0m Типы…');
});

test('индикатор очищается перед результатом при исключении; в файловом выводе он ничего не печатает', async () => {
    const events: string[] = [];
    await runSteps([{ name: 'Типы', run: () => { throw new Error('ошибка'); } }], {
        color: false,
        progress: (name: string) => { events.push(`start: ${name}`); return () => events.push('stop'); },
        write: (line: string) => events.push(line),
    });
    assert.equal(events[0], 'start: Типы');
    assert.equal(events[1], 'stop');
    assert.match(events[2] ?? '', /^✗ Типы \(\d+\.\d с\)\n  ошибка$/);
    const chunks: string[] = [];
    startProgress('Типы', { stream: { isTTY: false, write: (chunk: string) => chunks.push(chunk) } })();
    assert.deepEqual(chunks, []);
});

test('consumer steps use the generated theme projection rather than project theme paths', () => {
    const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
    const steps = projectSteps(kit, {});
    assert.equal(steps.length, 5);
});


test('репортёр тестов показывает упавший тест и причину, сохраняет предупреждение, скрывает успешные тесты', async () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ui check reporter '));
    const file = path.join(fixture, 'sample.test.mjs');
    try {
        fs.writeFileSync(file, `
            import { test } from 'node:test';
            import assert from 'node:assert/strict';
            test('успешный тест', () => console.log('шум успешного теста'));
            test('упавший тест', () => { console.warn('предупреждение теста'); assert.equal(1, 2); });
        `);
        const reporter = new URL('../../../../tools/check/reporter.mjs', import.meta.url).href;
        const result = await runNode(['--test', '--test-reporter', reporter, file], fixture);
        assert.equal(result.ok, false);
        assert.match(result.output, /упавший тест/);
        assert.match(result.output, /sample\.test\.mjs:\d+:\d+/);
        assert.match(result.output, /AssertionError/);
        assert.match(result.output, /предупреждение теста/);
        assert.doesNotMatch(result.output, /успешный тест|шум успешного теста/);
    } finally {
        fs.rmSync(file, { force: true });
        fs.rmdirSync(fixture);
    }
});

test('root discovery includes TS, TSX and MJS architecture tests but leaves type fixtures to tsc', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-test-discovery-'));
    try {
        for (const name of ['tests/Architecture/unit/rule.test.mjs', 'tests/Domain/unit/view.test.ts',
            'tests/Domain/unit/view.test.tsx', 'tests/Domain/unit/types.type-test.ts',
            'tests/Domain/unit/types.typecheck.tsx']) {
            const file = path.join(fixture, name);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, '');
        }
        assert.deepEqual(discoverTests(fixture), [
            'tests/Architecture/unit/rule.test.mjs',
            'tests/Domain/unit/view.test.ts',
            'tests/Domain/unit/view.test.tsx',
        ].map(file => path.normalize(file)));
        const config = JSON.parse(fs.readFileSync(new URL('../../../../tsconfig.json', import.meta.url), 'utf8'));
        assert.ok(config.include.some((entry: string) => entry.includes('*.ts')));
        assert.ok(config.include.some((entry: string) => entry.includes('*.tsx')));
    } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});

test('library discovery accepts all Node test extensions from root tests only', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-tool-discovery-'));
    try {
        const files = ['tests/Tools/unit/check/a.test.mts', 'tests/Tools/unit/b.test.cts', 'tests/Domain/unit/c.test.jsx',
            'tests/Domain/unit/d.test.cjs', 'tests/Domain/unit/e.test.js'];
        for (const file of [...files, 'tools/check/a.test.mts', 'tests/Tools/unit/check/fixture.type-test.ts',
            'tests/Domain/unit/example.spec.ts', 'tests/node_modules/ignored.test.ts']) {
            fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
            fs.writeFileSync(path.join(root, file), '');
        }
        assert.deepEqual(discoverTests(root), files.map(file => path.normalize(file)).sort());
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
