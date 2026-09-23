#!/usr/bin/env node
// CLI кита, запуск из папки проекта: build | watch | check [--update] [--config ui.config.ts].
//   build — public кита в public проекта, шкуры, утилиты; watch — то же и следит за правками;
//   check — красные линии (с планкой проекта) и договор темы.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, watch } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.dirname(TOOLS);
const root = process.cwd();
const argv = process.argv.slice(2);
const command = argv[0];
const configArg = argv.includes('--config') ? argv[argv.indexOf('--config') + 1] : 'ui.config.ts';
const configFile = path.resolve(root, configArg);

// Файлы конфига, словарей, пресетов и самого генератора: их правка перезапускает watch — в живом
// процессе модули не перечитать.
const graph = new Set([configFile]);
let config = {};

const track = (file) => file.includes(`${path.sep}node_modules${path.sep}`) || graph.add(file);

async function loadConfig() {
  // .ts проекта без "type": "module" грузится как CommonJS — нужны оба хука tsx.
  (await import('tsx/cjs/api')).register();
  (await import('tsx/esm/api')).register({ onImport: (url) => url.startsWith('file:') && track(fileURLToPath(url)) });
  if (!existsSync(configFile)) return config;
  const { default: loaded } = await import(pathToFileURL(configFile).href);
  // CommonJS отдаёт module.exports целиком: default-экспорт лежит ещё на уровень глубже.
  config = loaded?.default ?? loaded;
  return config;
}

// Модули, которые прошли через require, — в общем кеше CommonJS.
const trackRequired = () => Object.keys(createRequire(import.meta.url).cache).forEach(track);

async function load() {
  await loadConfig();
  const { createUtilities } = await import('./utilities/generate.ts');
  const { generateSkins } = await import('./skin.ts');
  const utilities = createUtilities(root, { scan: [...(config.scan ?? ['src']), path.relative(root, KIT)], seeds: config.seeds, scale: config.scale });

  // Иконки, которые компоненты зовут по адресу (/icons/ui/…). Прежняя копия снимается целиком,
  // чтобы убранная из кита иконка не жила в проекте вечно.
  const target = path.resolve(root, config.public ?? 'public');
  rmSync(path.join(target, 'icons', 'ui'), { recursive: true, force: true });
  copyDir(path.join(KIT, 'public'), target);

  if (config.skins) {
    const changed = await generateSkins(root, config.skins);
    console.log(`[ui:skin] ${changed ? `✓ обновлено файлов: ${changed}` : 'без изменений'}`);
  }
  return utilities;
}

// Не fs.cpSync: в Node 22.23 на Windows он с `recursive` роняет процесс (0xC0000409) без единой
// строки ошибки, если в пути есть кириллица.
function copyDir(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else copyFileSync(source, target);
  }
}

// Watch — надзиратель и рабочий: рабочий выходит с кодом 0, когда надо перечитать модули, и
// надзиратель поднимает его заново. Оба умирают вместе с родителем (IPC `disconnect`).
function supervise() {
  let worker;
  let stopping = false;
  const start = () => {
    worker = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch', '--worker', '--config', configArg], {
      cwd: root,
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      windowsHide: true,
    });
    worker.on('exit', (code) => (stopping ? undefined : code === 0 ? start() : process.exit(code ?? 1)));
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
    if (existsSync(dir)) watch(dir, (_event, file) => file && graph.has(path.join(dir, String(file))) && restart());
  }
  const skinsDir = config.skins && path.resolve(root, config.skins.dir);
  if (skinsDir) watch(skinsDir, { recursive: true }, (_event, file) => file && String(file).endsWith('.skin.ts') && restart());
  utilities?.watch(restart);
}

function check() {
  return loadConfig().then(() => {
    const run = (script, args) => spawnSync(process.execPath, [path.join(TOOLS, script), ...args], { cwd: root, stdio: 'inherit' }).status === 0;
    const update = argv.includes('--update') ? ['--update'] : [];
    const rules = run('check-rules.mjs', ['--baseline', config.baseline ?? '.rules-baseline.json', ...update, ...(config.rules ?? ['src'])]);
    const tokens = run('check-tokens.mjs', [config.theme ?? 'theme'].flat());
    return rules && tokens;
  });
}

const commands = {
  build: () => load().then((utilities) => utilities.build()),
  watch: () => (argv.includes('--worker') ? work() : supervise()),
  check,
};

if (!commands[command]) {
  console.error('Usage: node <UI>/tools/cli.mjs <build|watch|check> [--config ui.config.ts]');
  process.exit(1);
}
try {
  const ok = await commands[command]();
  if (ok !== undefined) process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`[ui] ✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
