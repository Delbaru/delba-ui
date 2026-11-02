import fs from 'node:fs';
import path from 'node:path';

const testFile = /\.(?:test|spec|type-test|typecheck)\.[cm]?[jt]sx?$/;

/** Tests belong to named tests/ folders; fixture/config implementation remains beside the harness. */
export function checkTestPlacement(root) {
  const visit = (directory) => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : visit(file);
    if (!testFile.test(entry.name)) return [];
    const relative = path.relative(root, file);
    return relative.split(path.sep).includes('tests') ? [] : [relative.split(path.sep).join('/')];
  });
  return ['src', 'tools'].flatMap((directory) => visit(path.join(root, directory))).sort();
}
