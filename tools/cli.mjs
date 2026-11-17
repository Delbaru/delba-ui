#!/usr/bin/env node
// CLI кита (`delba-ui` из bin пакета), запуск из папки проекта: build | watch | check | test [--config ui.config.ts].
//   build — шкуры и утилиты; watch — то же и следит за правками;
//   check — красные линии (с планкой проекта), договор темы и старые пути к киту.
//   test — полная проверка кита и его подключения к проекту.
import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectConfig, resolveConfigFile } from './config-loader.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.dirname(TOOLS);
const cwd = process.cwd();
let root = cwd;
const argv = process.argv.slice(2);
const command = argv[0];
if ((argv.includes('--failed') || argv.includes('--report')) && !['check', 'test'].includes(command)) {
    console.error('[ui] --failed and --report require check or test');
    process.exit(1);
}
if (argv.includes('--report') && (!argv[argv.indexOf('--report') + 1] || argv[argv.indexOf('--report') + 1].startsWith('--'))) {
    console.error('[ui] --report requires a file path');
    process.exit(1);
}
const configArg = argv.includes('--config')
    ? argv[argv.indexOf('--config') + 1]
    : path.resolve(cwd) === KIT
      ? null
      : undefined;
const configFile = resolveConfigFile({ cwd, config: configArg });

// Файлы конфига, словарей, пресетов и самого генератора: их правка перезапускает watch — в живом
// процессе модули не перечитать.
const graph = new Set(configFile ? [configFile] : []);
let config = {};

const track = (file) => file.includes(`${path.sep}node_modules${path.sep}`) || graph.add(file);

async function loadConfig() {
    // .ts проекта без "type": "module" грузится как CommonJS — нужны оба хука tsx.
    const loaded = await loadProjectConfig({ cwd, config: configArg, profile: 'ui' });
    if (loaded) {
        config = loaded.value;
        root = loaded.root;
        for (const file of loaded.files) graph.add(file);
        await loaded.close();
    }
    const { validateMotion } = await import('./motion.ts');
    const { validateImages } = await import('./images.ts');
    const { validateScrollbar } = await import('./scrollbar.ts');
    const { validateMessages } = await import('./messages.ts');
    try {
        validateMotion(config.motion);
        validateImages(config.images);
        validateScrollbar(config.scrollbar);
        validateMessages(config.messages);
    } catch (error) {
        throw new Error(
            `${configFile ? path.relative(root, configFile) : 'UI config'}: ${error instanceof Error ? error.message : error}`,
        );
    }
    return config;
}

// Модули, которые прошли через require, — в общем кеше CommonJS.
const trackRequired = () => Object.keys(createRequire(import.meta.url).cache).forEach(track);

async function load() {
    await loadConfig();
    const { generateMotion } = await import('./motion.ts');
    generateMotion(config.motion);
    const { generateImages } = await import('./images.ts');
    generateImages(config.images);
    const { generateMessages } = await import('./messages.ts');
    generateMessages(config.messages);
    const { generateInlineIcons, iconSourceNotices } = await import('./icons.ts');
    generateInlineIcons(root);
    const { generateScrollbar } = await import('./scrollbar.ts');
    generateScrollbar(config.scrollbar);
    const { createUtilities } = await import('./utilities/generate.ts');
    const { generateSkins } = await import('./skin.ts');
    const utilities = createUtilities(root, {
        scan: [...(config.scan ?? ['src']), path.relative(root, KIT)],
        seeds: config.seeds,
        typography: config.typography,
        scale: config.scale,
    });

    for (const { level, message } of iconSourceNotices(root, Object.hasOwn(config, 'public'))) {
        console[level](message);
    }

    if (config.skins) {
        const changed = await generateSkins(root, config.skins);
        console.log(`[ui:skin] ${changed ? `✓ обновлено файлов: ${changed}` : 'без изменений'}`);
    }
    return utilities;
}

// Watch — надзиратель и рабочий: рабочий выходит с кодом 0, когда надо перечитать модули, и
// надзиратель поднимает его заново. Оба умирают вместе с родителем (IPC `disconnect`).
function supervise() {
    let worker;
    let stopping = false;
    const start = () => {
        worker = spawn(
            process.execPath,
            [
                fileURLToPath(import.meta.url),
                'watch',
                '--worker',
                ...(configFile ? ['--config', configFile] : []),
            ],
            {
                cwd,
                stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
                windowsHide: true,
            },
        );
        worker.on('exit', (code) =>
            stopping ? undefined : code === 0 ? start() : process.exit(code ?? 1),
        );
    };
    const stop = () => {
        stopping = true;
        worker?.kill();
        process.exit(0);
    };
    process.on('disconnect', stop);
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    start();
}

async function work() {
    process.on('disconnect', () => process.exit(0));
    const restart = () => process.exit(0);
    let utilities;
    try {
        utilities = await load();
    } catch (error) {
        // Опечатка в пресете не гасит watch: ждём правки и пробуем заново.
        console.error(`[ui] ✗ ${error instanceof Error ? error.message : error}`);
    }
    trackRequired();
    for (const dir of new Set([...graph].map((file) => path.dirname(file)))) {
        if (existsSync(dir))
            watch(
                dir,
                (_event, file) => file && graph.has(path.join(dir, String(file))) && restart(),
            );
    }
    // `dir` необязателен (см. `UiSkins`): проект, который печатает состояния сам, берёт у кита
    // только словари — и папки компонентов у него нет. Без проверки тут `path.resolve` ронял watch.
    const skinsDir =
        config.skins?.dir === undefined ? undefined : path.resolve(root, config.skins.dir);
    if (skinsDir)
        watch(
            skinsDir,
            { recursive: true },
            (_event, file) => file && String(file).endsWith('.skin.ts') && restart(),
        );
    utilities?.watch(restart);
    const publicDir = path.join(root, 'public');
    if (existsSync(publicDir))
        watch(publicDir, { recursive: true }, (_event, file) => {
            const name = String(file ?? '').replaceAll('\\', '/');
            if (name === 'icons' || (name.startsWith('icons/') && name.endsWith('.svg'))) restart();
        });
}

async function check() {
    await loadConfig();
    const { generateMotion } = await import('./motion.ts');
    generateMotion(config.motion);
    const { generateImages } = await import('./images.ts');
    generateImages(config.images);
    const { generateMessages } = await import('./messages.ts');
    generateMessages(config.messages);
    const { projectSteps } = await import('./check/index.mjs');
    const { runSteps } = await import('./check/run.mjs');
    return runSteps(
        projectSteps(root, config, {
            update: argv.includes('--update'),
            fix: argv.includes('--fix'),
            configFiles: configFile ? [configFile] : [],
        }),
        {
            reportFile: argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : path.join(root, '.verification/ui-check.json'),
            failedOnly: argv.includes('--failed'),
            profile: { root, configFile, update: argv.includes('--update'), fix: argv.includes('--fix') },
        },
    );
}

async function test() {
    await loadConfig();
    const { runUiChecks } = await import('./check/index.mjs');
    return runUiChecks({
        project: root,
        config,
        configArg: configFile ?? undefined,
        fix: argv.includes('--fix'),
        suite: argv.includes('--suite') ? argv[argv.indexOf('--suite') + 1] : undefined,
        shard: argv.includes('--shard') ? argv[argv.indexOf('--shard') + 1] : undefined,
        typecheckCache: argv.includes('--typecheck-cache')
            ? argv[argv.indexOf('--typecheck-cache') + 1] || ''
            : undefined,
        failedOnly: argv.includes('--failed'),
        reportFile: argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : undefined,
    });
}

const commands = {
    startup: async () => (await import('./startup-check.mjs')).checkStartup(argv.slice(1)),
    build: () => load().then((utilities) => utilities.build()),
    watch: () => (argv.includes('--worker') ? work() : supervise()),
    check,
    test,
};

if (!commands[command]) {
    console.error(
        'Usage: delba-ui <build|watch|check|test> [--update] [--fix] [--config ui.config.ts] [--suite standard|all|library|project|browser] [--shard index/total] [--typecheck-cache file] [--failed] [--report file]\n       delba-ui startup --url <running production URL> [--font "selector=family"] [--max-cls 0.001]',
    );
    process.exit(1);
}
try {
    const ok = await commands[command]();
    if (ok !== undefined) process.exit(ok ? 0 : 1);
} catch (error) {
    console.error(`[ui] ✗ ${error instanceof Error ? error.message : error}`);
    process.exit(1);
}
