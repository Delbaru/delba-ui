import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMotionTimingName, motionTimingVariable } from '../src/core/base/timing';
import { isMotionDistanceName, motionDistanceVariable, normalizeMotionDistance } from '../src/core/base/distance';
import type { UiMotion } from './config';
import { isVisibilityMargin } from '../src/core/base/animation-visibility';

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
  assertOnlyKeys(value, ['timing', 'distance', 'visibility'], 'motion');
  if ('visibility' in value) {
    if (!isRecord(value.visibility)) throw new Error('motion.visibility must be an object');
    assertOnlyKeys(value.visibility, ['rootMargin'], 'motion.visibility');
    if (!isVisibilityMargin(value.visibility.rootMargin)) throw new Error('motion.visibility.rootMargin must contain one to four px/% margins');
  }

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

  if ('distance' in value) {
    const distance = value.distance;
    if (!isRecord(distance)) throw new Error('motion.distance must be an object');
    if (Object.keys(distance).length === 0) throw new Error('motion.distance must contain at least one distance');
    for (const [name, amount] of Object.entries(distance)) {
      if (!isMotionDistanceName(name)) throw new Error(`motion.distance.${name} must be a camelCase name`);
      if (normalizeMotionDistance(amount) === null || (typeof amount === 'number' && amount < 0) || (typeof amount === 'string' && !amount.endsWith('%'))) {
        throw new Error(`motion.distance.${name} must be a finite non-negative number of rpx or a non-negative percentage`);
      }
    }
  }
}

/** Render the global timing variables; an unset section emits only a comment for existing themes. */
export function motionScss(motion?: UiMotion): string {
  validateMotion(motion);
  if (!motion) return EMPTY_MOTION;

  const declarations = Object.entries(motion.timing).map(([name, seconds]) => `  ${motionTimingVariable(name)}: ${seconds}s;`);
  if (motion.visibility) declarations.push(`  --t-m-visibility-root-margin: ${motion.visibility.rootMargin.trim()};`);
  for (const [name, value] of Object.entries(motion.distance ?? {})) {
    declarations.push(`  ${motionDistanceVariable(name)}: ${typeof value === 'number' ? `calc(var(--rpx) * ${value})` : value};`);
  }
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
