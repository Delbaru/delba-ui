import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { resolveScale, scaleCss, type UiScale } from '../../src/core/base/scale';
import { normalizeCss } from '../../src/core/utilities/keys';
import { renderRules, type UtilityRule } from '../../src/core/utilities/rules';
import { extractUtilityRules, type ExtractOptions, type Source } from './extract';

// Генератор таблицы утилит: разбирает исходники проекта компилятором TypeScript и пишет два
// генерата кита (вне git, у каждого проекта свои):
//   core/_utilities.scss   — классы утилит под значения, найденные в коде проекта;
//   core/_field-sizes.scss — числовые высоты для полей (`height_56` ставит ещё и `--input-height`);
//   core/_scale.scss, core/scale.ts — масштаб (`--rpx` по полосам и те же базы для `sizes` у Img).

export interface UtilitiesConfig extends ExtractOptions {
  /** Папки исходников — от `root`. */
  readonly scan: readonly string[];
  /** Базовые ширины макета; не задано — умолчания кита. */
  readonly scale?: Partial<UiScale>;
}

export const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_CSS = path.join(LIB, 'src', 'core', '_utilities.scss');
const OUT_FIELDS = path.join(LIB, 'src', 'core', '_field-sizes.scss');
const OUT_SCALE_CSS = path.join(LIB, 'src', 'core', '_scale.scss');
const OUT_SCALE_TS = path.join(LIB, 'src', 'core', 'scale.ts');
/** Код самого генератора: его правка подхватывается только новым процессом. */
export const OWN_SOURCES = [path.join(LIB, 'tools'), path.join(LIB, 'src', 'core', 'utilities')];
const SKIP = /(^|[\\/])(node_modules|\.next|dist|generated|\.git|public)([\\/]|$)|\.d\.ts$|\.(test|spec)\.tsx?$/;
const BANNER = '// AUTO-GENERATED: tools/utilities (npm run ui:build). Не править руками.\n';

const isOwn = (file: string) => OWN_SOURCES.some((dir) => file.startsWith(dir + path.sep));

/**
 * Файлы `.ts/.tsx` папки скана. SKIP проверяется по пути ОТ корня скана, а не по абсолютному: кит,
 * поставленный git-зависимостью, сам лежит в `<проект>/node_modules/@delba/ui` — по полному пути
 * он выпал бы целиком, а `node_modules` внутри корня скана должен пропускаться, как и раньше.
 */
export function walk(root: string, dir = root, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP.test(path.relative(root, full))) continue;
    if (entry.isDirectory()) walk(root, full, out);
    else if (/\.tsx?$/.test(entry.name) && !isOwn(full)) out.push(full);
  }
  return out;
}

// Алиасы: tsconfig.base.json монорепо, иначе tsconfig.json проекта (с комментариями — читает TypeScript).
function readPaths(root: string): Record<string, string[]> {
  for (const name of ['tsconfig.base.json', 'tsconfig.json']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const { config } = ts.readConfigFile(file, ts.sys.readFile) as { config?: { compilerOptions?: { paths?: Record<string, string[]> } } };
    return config?.compilerOptions?.paths ?? {};
  }
  return {};
}

const candidates = (base: string) => [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];

function writeIfChanged(file: string, content: string): boolean {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

export function createUtilities(root: string, config: UtilitiesConfig) {
  const cache = new Map<string, { mtime: number; text: string }>();
  const paths = readPaths(root);

  function readSources(): Source[] {
    const files = config.scan.flatMap((dir) => walk(path.resolve(root, dir)));
    const alive = new Set(files);
    for (const file of cache.keys()) if (!alive.has(file)) cache.delete(file);
    return files.map((file) => {
      const mtime = fs.statSync(file).mtimeMs;
      const cached = cache.get(file);
      if (cached && cached.mtime === mtime) return { file, text: cached.text };
      const text = fs.readFileSync(file, 'utf8');
      cache.set(file, { mtime, text });
      return { file, text };
    });
  }

  function makeResolver(known: Set<string>) {
    return (fromFile: string, specifier: string): string | undefined => {
      const bases: string[] = [];
      if (specifier.startsWith('.')) bases.push(path.resolve(path.dirname(fromFile), specifier));
      for (const [pattern, targets] of Object.entries(paths)) {
        const star = pattern.endsWith('*') ? pattern.slice(0, -1) : null;
        if (star !== null ? specifier.startsWith(star) : specifier === pattern) {
          const rest = star !== null ? specifier.slice(star.length) : '';
          for (const target of targets) bases.push(path.resolve(root, target.replace('*', rest)));
        }
      }
      for (const base of bases) for (const file of candidates(base)) if (known.has(file)) return file;
      return undefined;
    };
  }

  function build(): boolean {
    const started = performance.now();
    const sources = readSources();
    const rules = extractUtilityRules(sources, { ...config, resolveModule: makeResolver(new Set(sources.map((s) => s.file))) });

    const unique = new Map<string, UtilityRule>();
    const collisions: string[] = [];
    for (const rule of rules) {
      const existing = unique.get(rule.className);
      if (existing && normalizeCss(existing.declaration) !== normalizeCss(rule.declaration)) collisions.push(`${rule.className}: «${existing.declaration}» ≠ «${rule.declaration}»`);
      else unique.set(rule.className, rule);
    }

    if (collisions.length) {
      console.error(`[ui:utilities] ✗ разные значения дали одно имя класса (${collisions.length}):`);
      for (const line of collisions.slice(0, 20)) console.error(`    ${line}`);
      return false;
    }

    // Модуль поля печатает `.height_#{$t}`: имя класса выдерживает только целое неотрицательное число.
    const isFieldHeight = (entry: unknown): entry is number => typeof entry === 'number' && Number.isInteger(entry) && entry >= 0;
    const heights = [...new Set([...unique.values()].filter((r) => r.utility.name === 'h').map((r) => r.entry).filter(isFieldHeight))].sort((a, b) => a - b);

    const css = `${BANNER}\n${renderRules([...unique.values()])}\n`;
    const fields = `${BANNER}\n$height-values: (${heights.join(', ')}) !default;\n`;
    const scale = resolveScale(config.scale);
    const scaleTs = `${BANNER}import type { UiScale } from './base/scale';\n\nexport const SCALE: UiScale = ${JSON.stringify(scale)};\n`;
    const changed = [
      writeIfChanged(OUT_CSS, css),
      writeIfChanged(OUT_FIELDS, fields),
      writeIfChanged(OUT_SCALE_CSS, `${BANNER}\n${scaleCss(scale)}`),
      writeIfChanged(OUT_SCALE_TS, scaleTs),
    ].some(Boolean);

    const ms = Math.round(performance.now() - started);
    console.log(`[ui:utilities] ${changed ? '✓ обновлено' : 'без изменений'}: ${unique.size} классов, ${(Buffer.byteLength(css) / 1024).toFixed(1)} КБ за ${ms} мс`);
    return true;
  }

  /** Пересборка на правку исходников; `onOwnChange` — правка самого генератора. */
  function watch(onOwnChange: () => void): void {
    for (const dir of OWN_SOURCES) {
      fs.watch(dir, { recursive: true }, (_event, file) => {
        if (file && /\.(ts|mjs)$/.test(String(file))) onOwnChange();
      });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    for (const dir of config.scan) {
      const full = path.resolve(root, dir);
      fs.watch(full, { recursive: true }, (_event, file) => {
        if (!file) return;
        const changed = path.join(full, String(file));
        if (!/\.tsx?$/.test(changed) || SKIP.test(path.relative(full, changed)) || isOwn(changed)) return;
        clearTimeout(timer);
        timer = setTimeout(build, 200);
      });
    }
    build();
  }

  return { build, watch };
}
