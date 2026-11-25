import fs from 'node:fs';
import path from 'node:path';

const testFile = /\.(?:test|spec|type-test|typecheck)\.[cm]?[jt]sx?$/;

/** Runtime sources contain no tests; tool tests stay with their harness in named tests/ folders. */
export function checkTestPlacement(root) {
  const visit = (directory) => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : visit(file);
    if (!testFile.test(entry.name)) return [];
    const relative = path.relative(root, file);
    return !relative.startsWith(`src${path.sep}`) && relative.split(path.sep).includes('tests') ? [] : [relative.split(path.sep).join('/')];
  });
  return ['src', 'tools'].flatMap((directory) => visit(path.join(root, directory))).sort();
}
