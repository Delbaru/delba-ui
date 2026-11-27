import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { renderSkinAxes } from './skin-axes';
import type { UiSkins } from './config';

// Генератор шкур: словари осей → skin/_tokens.scss (карты для движка) и skin/_classes.scss (классы
// покоя), пресеты `*.skin.ts` → `_states.scss` рядом с компонентом. Все три — генераты, вне git.

const SKIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'skin');
const BANNER = '// Автогенерат шкур кита (tools/skin.ts) — не править руками.\n\n';
const EFFECTS = ['opacity', 'filter', 'cursor', 'pointerEvents', 'borderColor'];
const STATES_MODULE = '@delba/frontend/skin-states';
const SKIP_SKIN_DIRS = new Set(['node_modules', 'tests', '__tests__', 'generated', 'dist', 'build', 'coverage']);
let skinSession = 0;

/** One skin definition per named owner, including nested visual components. */
export function componentSkinSources(directory: string): Array<{ folder: string; file: string }> {
  const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const skinFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.skin.ts'));
  if (skinFiles.length > 1) throw new Error(`${directory}: несколько владельцев skin в одной папке`);

  const sources = skinFiles.map((entry) => ({ folder: directory, file: entry.name }));
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_SKIN_DIRS.has(entry.name)) continue;
    sources.push(...componentSkinSources(path.join(directory, entry.name)));
  }
  return sources;
}

type Props = Record<string, unknown>;

const sassMap = (props: Props) =>
  `(${Object.entries(props)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(', ')})`;

function presetRule(name: string, preset: Props, effects_: ReadonlySet<string>): string | null {
  const effects = Object.fromEntries(Object.entries(preset).filter(([k]) => effects_.has(k)));
  const states = (preset.states ?? {}) as Record<string, Props>;
  const body: string[] = [];
  if (Object.keys(effects).length > 0) body.push(`  @include base(${sassMap(effects)});`);
  if (Object.keys(states).length > 0) {
    const lines = Object.entries(states).map(
      ([state, props]) => `    ${state}: ${sassMap(props)},`,
    );
    body.push(`  @include states((\n${lines.join('\n')}\n  ));`);
  }
  return body.length > 0 ? `.skin-${name} {\n${body.join('\n')}\n}` : null;
}

const isSkin = (value: unknown): value is { presets: Record<string, Props> } =>
  typeof value === 'object' && value !== null && 'presets' in value;

export function skinDefinition(
  mod: Record<string, unknown>,
  source: string,
): { presets: Record<string, Props> } | null {
  if (Object.hasOwn(mod, 'skin') && mod.skin === null) return null;

  // Из CommonJS экспорты приезжают и поимённо, и одним default.
  const def = [...Object.values(mod), ...Object.values(mod.default ?? {})].find(isSkin);
  if (!def) throw new Error(`${source}: нет экспорта defineSkin(...) или skin = null`);
  return def;
}

export async function generateComponentSkin(
  folder: string,
  skinFile: string,
  statesModule: string,
  effects: ReadonlySet<string>,
): Promise<boolean> {
  const source = `${path.basename(folder)}/${skinFile}`;
  // Skin definitions and their TS imports must be fresh on each watch regeneration.
  // This source session owns only this generator's definition, never project configuration.
  const { register } = await import('tsx/cjs/api');
  const namespace = `frontend-skin-${process.pid}-${++skinSession}`;
  const session = register({ namespace });
  let mod: Record<string, unknown>;
  try {
    mod = session.require(path.join(folder, skinFile), import.meta.url) as Record<string, unknown>;
  } finally {
    session.unregister();
    const cache = createRequire(import.meta.url).cache;
    for (const key of Object.keys(cache)) {
      if (key.endsWith(`?namespace=${namespace}`)) delete cache[key];
    }
  }
  const def = skinDefinition(mod, source);
  const output = path.join(folder, '_states.scss');

  if (!def) {
    if (!fs.existsSync(output)) return false;
    fs.rmSync(output);
    return true;
  }

  const rules = Object.entries(def.presets)
    .map(([name, preset]) => presetRule(name, preset, effects))
    .filter(Boolean);
  const content = `${BANNER}@use '${statesModule}' as *;\n${rules
    .map((rule) => `\n${rule}\n`)
    .join('')}`;
  if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') === content) return false;
  fs.writeFileSync(output, content);
  return true;
}

/** Пишет генераты шкур; возвращает число изменённых файлов. */
export async function generateSkins(root: string, skins: UiSkins): Promise<number> {
  let changed = 0;
  const write = (file: string, content: string) => {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
    fs.writeFileSync(file, content);
    changed++;
  };

  const rendered = renderSkinAxes(skins);
  write(path.join(SKIN, '_tokens.scss'), BANNER + rendered.tokens);
  write(path.join(SKIN, '_classes.scss'), BANNER + rendered.classes);

  if (skins.dir === undefined) return changed;

  const effects = new Set(skins.effects ?? EFFECTS);
  const statesModule = skins.states ?? STATES_MODULE;
  const dir = path.resolve(root, skins.dir);
  for (const { folder, file } of componentSkinSources(dir)) {
    if (await generateComponentSkin(folder, file, statesModule, effects)) changed++;
  }
  return changed;
}
