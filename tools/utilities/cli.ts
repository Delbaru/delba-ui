#!/usr/bin/env node
/**
 * Генератор утилит отдельно от CLI кита — для проектов со своим скриптом сборки:
 *
 *   node --import tsx <UI>/tools/utilities/cli.ts build --config tools/ui/utilities.config.ts
 *   node --import tsx <UI>/tools/utilities/cli.ts watch --config tools/ui/utilities.config.ts
 *
 * Конфиг проекта (default export): `{ scan: ['apps', 'libs'], seeds? }`, пути — от cwd.
 * Проще — CLI `delba-ui` (bin пакета): он же собирает шкуры и гоняет проверки.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createUtilities, type UtilitiesConfig } from './generate';

const args = process.argv.slice(2);
const command = args[0] ?? 'build';
const configArg = args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined;

async function main(): Promise<void> {
  if (!configArg) {
    console.error('[ui:utilities] нужен --config <файл конфига проекта>');
    process.exit(1);
  }
  const root = process.cwd();
  const config = ((await import(pathToFileURL(path.resolve(root, configArg)).href)) as { default: UtilitiesConfig }).default;
  const utilities = createUtilities(root, config);
  // Правка генератора — выход: скрипт проекта поднимает watch заново уже с новым кодом.
  if (command === 'watch')
    utilities.watch(() => {
      console.log('[ui:utilities] генератор изменился — перезапуск');
      process.exit(0);
    });
  else process.exit(utilities.build() ? 0 : 1);
}

void main();
