// Плагин Next: `export default withFrontend(nextConfig)`. Даёт sassOptions под кит и генераты кита
// (CLI `delba-frontend`): в `next build` — одна сборка до компиляции, в `next dev` — сборка и watcher.
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(TOOLS, 'cli.mjs');

function generate(phase, options) {
    const configArgs = options.config ? ['--config', options.config] : [];
    const dev = phase === 'phase-development-server';
    if (!dev && phase !== 'phase-production-build') return;
    // Конфиг Next грузят несколько процессов: генерирует первый, дочерние наследуют метку из env.
    if (process.env.DELBA_FRONTEND_OWNER) return;
    process.env.DELBA_FRONTEND_OWNER = String(process.pid);

    if (
        spawnSync(process.execPath, [CLI, 'build', ...configArgs], { stdio: 'inherit' }).status !==
        0
    ) {
        throw new Error('[ui] генерация кита упала — причина выше');
    }
    if (!dev) return;
    // IPC-канал: watcher выходит, когда канал рвётся, то есть вместе с dev — и на Windows, где
    // Ctrl+C и taskkill не доходят до внуков. unref — чтобы watcher не держал dev живым.
    const watcher = spawn(process.execPath, [CLI, 'watch', ...configArgs], {
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        windowsHide: true,
    });
    watcher.unref();
    watcher.channel?.unref();
}

/** Папка SCSS-входов кита для `sassOptions.loadPaths`: `@use '@delba/frontend/mixins'` и прочие. */
export const FRONTEND_SASS = path.join(TOOLS, 'sass');

/** Подключает кит к Next: исходники кита в сборку, SCSS-входы `@delba/frontend/*` и генераты. */
export function withFrontend(nextConfig = {}, options = {}) {
    return async (phase, context) => {
        const config =
            typeof nextConfig === 'function' ? await nextConfig(phase, context) : nextConfig;
        generate(phase, options);
        return {
            ...config,
            // Кит — исходники TS, а не собранный пакет: без этого Next не компилирует его из node_modules.
            transpilePackages: [...new Set([...(config.transpilePackages ?? []), '@delba/frontend'])],
            // SCSS-входы — файлы в loadPaths, а не `exports`: файл, отданный импортёром сборщика, теряет
            // относительные `@use` и `meta.load-css` внутри себя (Turbopack не резолвит их от него).
            sassOptions: {
                api: 'modern-compiler',
                ...config.sassOptions,
                loadPaths: [FRONTEND_SASS, ...(config.sassOptions?.loadPaths ?? [])],
            },
        };
    };
}
