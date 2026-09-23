// Плагин Next: `export default withUi(nextConfig)`. Даёт sassOptions под кит и генераты кита
// (tools/cli.mjs): в `next build` — одна сборка до компиляции, в `next dev` — сборка и watcher.
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.dirname(TOOLS);
const CLI = path.join(TOOLS, 'cli.mjs');

function generate(phase) {
  const dev = phase === 'phase-development-server';
  if (!dev && phase !== 'phase-production-build') return;
  // Конфиг Next грузят несколько процессов: генерирует первый, дочерние наследуют метку из env.
  if (process.env.DELBA_UI_OWNER) return;
  process.env.DELBA_UI_OWNER = String(process.pid);

  if (spawnSync(process.execPath, [CLI, 'build'], { stdio: 'inherit' }).status !== 0) {
    throw new Error('[ui] генерация кита упала — причина выше');
  }
  if (!dev) return;
  // IPC-канал: watcher выходит, когда канал рвётся, то есть вместе с dev — и на Windows, где
  // Ctrl+C и taskkill не доходят до внуков. unref — чтобы watcher не держал dev живым.
  const watcher = spawn(process.execPath, [CLI, 'watch'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true });
  watcher.unref();
  watcher.channel?.unref();
}

/** Подключает кит к Next: sassOptions (`@use 'ui/core/mixins'`) и генераты кита. */
export function withUi(nextConfig = {}) {
  return async (phase, context) => {
    const config = typeof nextConfig === 'function' ? await nextConfig(phase, context) : nextConfig;
    generate(phase);
    return {
      ...config,
      // Легаси-API sass зовёт импортёр без базового URL и не находит `meta.load-css` ядра;
      // loadPaths — чтобы модули звали ядро коротким `ui/…`, а не цепочкой `../`.
      sassOptions: {
        api: 'modern-compiler',
        ...config.sassOptions,
        loadPaths: [path.dirname(KIT), ...(config.sassOptions?.loadPaths ?? [])],
      },
    };
  };
}
