import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMotionTimingName, motionTimingVariable } from '../src/core/base/timing';
import type { UiMotion } from './config';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(KIT, 'src', 'core', '_motion.scss');
const EMPTY_MOTION = '// AUTO-GENERATED: no motion timings configured in ui.config.ts.\n';

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], prefix: string): void {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) throw new Error(`${prefix}.${extras[0]} is not allowed`);
}

/** Validate the exact public motion shape before any build/check/test command can mutate files. */
export function validateMotion(value: unknown): asserts value is UiMotion | undefined {
  if (value === undefined) return;
  if (!isRecord(value)) throw new Error('motion must be an object');
  assertOnlyKeys(value, ['timing'], 'motion');

  if (!('timing' in value)) throw new Error('motion.timing is required');
  const timing = value.timing;
  if (!isRecord(timing)) throw new Error('motion.timing must be an object');
  const entries = Object.entries(timing);
  if (entries.length === 0) throw new Error('motion.timing must contain at least one duration');

  for (const [name, duration] of entries) {
    if (!isMotionTimingName(name)) throw new Error(`motion.timing.${name} must be a camelCase name`);
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
      throw new Error(`motion.timing.${name} must be a finite non-negative number of seconds`);
    }
  }
}

/** Render the global timing variables; an unset section emits only a comment for existing themes. */
export function motionScss(motion?: UiMotion): string {
  validateMotion(motion);
  if (!motion) return EMPTY_MOTION;

  const declarations = Object.entries(motion.timing).map(([name, seconds]) => `  ${motionTimingVariable(name)}: ${seconds}s;`);
  return `// AUTO-GENERATED: tools/motion.ts (ui.config.ts). Do not edit.\n:root {\n${declarations.join('\n')}\n}\n`;
}

function writeIfChanged(file: string, content: string): boolean {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

/** Write the kit-owned partial only when its generated contents changed. */
export function generateMotion(motion?: UiMotion): boolean {
  return writeMotionScss(OUTPUT, motion);
}

/** Write a generated partial to a target path (also used to test write-if-changed behavior). */
export function writeMotionScss(file: string, motion?: UiMotion): boolean {
  return writeIfChanged(file, motionScss(motion));
}
