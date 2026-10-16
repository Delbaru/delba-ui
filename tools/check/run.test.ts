import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';

import { formatProgress, formatStep } from './format.mjs';
import { startProgress } from './progress.mjs';
import { projectSteps, uiCheckSteps } from './index.mjs';
import { runNode, runSteps } from './run.mjs';

test('CI suites cover the complete gate without dropping checks; each starts with generation', () => {
    const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../site');
    const complete = uiCheckSteps({ project }).map((step: { name: string }) => step.name);
    const partitioned = ['library', 'project', 'browser'].flatMap((suite) => {
        const steps = uiCheckSteps({ project, suite });
        assert.equal(steps[0]?.name, 'Генерация');
        return steps.filter((step: { name: string }) => step.name !== 'Генерация').map((step: { name: string }) => step.name);
    });
    assert.deepEqual(partitioned.sort(), complete.filter((name: string) => name !== 'Генерация').sort());
    assert.throws(() => uiCheckSteps({ suite: 'typo' }), /Unknown UI suite/);
    assert.throws(() => uiCheckSteps({ suite: 'project', fix: true }), /complete UI suite/);
    for (const shard of ['0/4', '5/4', '1/0', 'oops']) {
        assert.throws(() => uiCheckSteps({ suite: 'browser', shard }), /valid index\/total/);
    }
    assert.throws(() => uiCheckSteps({ suite: 'all', shard: '1/4' }), /--suite browser/);
    assert.deepEqual(uiCheckSteps({ project, suite: 'browser', shard: '1/4' }).map((step: { name: string }) => step.name), ['Генерация', 'Браузер']);
});

test('opt-in incremental consumer types still reject changed source and global declarations', async () => {
    assert.throws(() => uiCheckSteps({ suite: 'all', typecheckCache: 'cache.tsbuildinfo' }), /--suite project/);
    assert.throws(() => uiCheckSteps({ suite: 'project', typecheckCache: '' }), /--suite project/);
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ui incremental types '));
    const files = ['tsconfig.json', 'source.ts', 'globals.d.ts', 'cache.tsbuildinfo'];
    try {
        fs.writeFileSync(path.join(fixture, 'tsconfig.json'), JSON.stringify({
            compilerOptions: { strict: true, noEmit: true, types: [], skipLibCheck: true, target: 'ES2022' },
            files: ['source.ts', 'globals.d.ts'],
        }));
        const source = path.join(fixture, 'source.ts');
        const globals = path.join(fixture, 'globals.d.ts');
        fs.writeFileSync(source, 'const result: SharedResult = { value: 1 };');
        fs.writeFileSync(globals, 'interface SharedResult { value: number }');
        const check = uiCheckSteps({ project: fixture, suite: 'project', typecheckCache: 'cache.tsbuildinfo' })
            .find((step: { name: string }) => step.name === 'Типы проекта');
        assert.ok(check);
        assert.equal((await check.run()).ok, true);
        assert.ok(fs.existsSync(path.join(fixture, 'cache.tsbuildinfo')));
        assert.equal((await check.run()).ok, true);
        fs.writeFileSync(source, 'const result: SharedResult = { value: "invalid" };');
        assert.equal((await check.run()).ok, false);
        fs.writeFileSync(source, 'const result: SharedResult = { value: 1 };');
        assert.equal((await check.run()).ok, true);
        fs.writeFileSync(globals, 'interface SharedResult { value: string }');
        const failure = await check.run();
        assert.equal(failure.ok, false);
        assert.match(failure.output, /source.ts/);
    } finally {
        for (const file of files) fs.rmSync(path.join(fixture, file), { force: true });
        fs.rmdirSync(fixture);
    }
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
    assert.equal(formatStep('Браузер', { ok: true, durationMs: 12345 }), '✓ Браузер (12.3 с)');
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

test('полная проверка темы возвращает ошибку при недостающих токенах; быстрая сохраняет предупреждение', async () => {
    const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const config = { theme: '__missing_check_theme__' };
    const strict = projectSteps(kit, config, { strict: true })[1];
    const quick = projectSteps(kit, config)[1];
    assert.ok(strict);
    assert.ok(quick);
    const failure = await strict.run();
    assert.equal(failure.ok, false);
    assert.match(failure.output, /договор темы/);
    const warning = await quick.run();
    assert.equal(warning.ok, true);
    assert.match(warning.warnings, /договор темы/);
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
        const reporter = new URL('./reporter.mjs', import.meta.url).href;
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
