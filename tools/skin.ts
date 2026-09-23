import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { borderClass, fillClass, textClass } from '../src/skin/index';
import type { UiSkins } from './config';

// Генератор шкур: словари осей → skin/_tokens.scss (карты для движка) и skin/_classes.scss (классы
// покоя), пресеты `*.skin.ts` → `_states.scss` рядом с компонентом. Все три — генераты, вне git.

const SKIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'skin');
const BANNER = '// Автогенерат шкур кита (tools/skin.ts) — не править руками.\n\n';
const EFFECTS = new Set(['opacity', 'filter', 'cursor', 'pointerEvents', 'borderColor']);

type Props = Record<string, unknown>;

const map = (name: string, entries: [string, string][]) => `$${name}: (\n${entries.map(([k, v]) => `  '${k}': ${v},\n`).join('')});\n`;
const sassMap = (props: Props) => `(${Object.entries(props).map(([k, v]) => `${k}: ${String(v)}`).join(', ')})`;

function presetRule(name: string, preset: Props): string | null {
  const effects = Object.fromEntries(Object.entries(preset).filter(([k]) => EFFECTS.has(k)));
  const states = (preset.states ?? {}) as Record<string, Props>;
  const body: string[] = [];
  if (Object.keys(effects).length > 0) body.push(`  @include base(${sassMap(effects)});`);
  if (Object.keys(states).length > 0) {
    const lines = Object.entries(states).map(([state, props]) => `    ${state}: ${sassMap(props)},`);
    body.push(`  @include states((\n${lines.join('\n')}\n  ));`);
  }
  return body.length > 0 ? `.skin-${name} {\n${body.join('\n')}\n}` : null;
}

const isSkin = (value: unknown): value is { presets: Record<string, Props> } => typeof value === 'object' && value !== null && 'presets' in value;

/** Пишет генераты шкур; возвращает число изменённых файлов. */
export async function generateSkins(root: string, skins: UiSkins): Promise<number> {
  let changed = 0;
  const write = (file: string, content: string) => {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
    fs.writeFileSync(file, content);
    changed++;
  };

  const lines = Object.entries(skins.lines);
  write(
    path.join(SKIN, '_tokens.scss'),
    BANNER +
      [map('fills', Object.entries(skins.fills)), map('lines', lines.map(([k, [w, c]]) => [k, `(${w}, ${c})`])), map('texts', Object.entries(skins.texts))].join('\n'),
  );
  write(
    path.join(SKIN, '_classes.scss'),
    BANNER +
      [
        ...Object.entries(skins.fills).map(([k, v]) => `.${fillClass(k)} { background: ${v}; }`),
        ...lines.map(([k, [w, c]]) => `.${borderClass(k)} { border: calc(${w} * var(--rpx)) solid ${c}; }`),
        ...Object.entries(skins.texts).map(([k, v]) => `.${textClass(k)} { color: ${v}; }`),
      ].join('\n') +
      '\n',
  );

  const dir = path.resolve(root, skins.dir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(dir, entry.name);
    const skinFile = fs.readdirSync(folder).find((f) => f.endsWith('.skin.ts'));
    if (!skinFile) continue;

    const mod = (await import(pathToFileURL(path.join(folder, skinFile)).href)) as Record<string, unknown>;
    // Из CommonJS экспорты приезжают и поимённо, и одним default.
    const def = [...Object.values(mod), ...Object.values(mod.default ?? {})].find(isSkin);
    if (!def) throw new Error(`${entry.name}/${skinFile}: нет экспорта defineSkin(...)`);

    const rules = Object.entries(def.presets).map(([name, preset]) => presetRule(name, preset)).filter(Boolean);
    write(path.join(folder, '_states.scss'), `${BANNER}@use '@delba/ui/skin-states' as *;\n${rules.map((rule) => `\n${rule}\n`).join('')}`);
  }
  return changed;
}
