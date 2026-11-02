import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_COMPONENT = /^D[A-Z][A-Za-z0-9]*$/;
const DEFAULT_ROOTS = ['src/shared/ui', 'src/cms/ui'];

function expectedFiles(componentName) {
  return [
    `${componentName}.tsx`,
    `${componentName}.config.ts`,
    `${componentName}.skin.ts`,
    `${componentName}.module.scss`,
    'index.ts',
  ];
}

function legacyFiles(componentName) {
  const lowerName = componentName.toLowerCase();
  const lowerBaseName = componentName.slice(1).toLowerCase();
  return [
    `${lowerName}.tsx`,
    `${lowerName}.config.ts`,
    `${lowerName}.skin.ts`,
    `${lowerName}.module.scss`,
    `${lowerBaseName}.tsx`,
    `${lowerBaseName}.config.ts`,
    `${lowerBaseName}.skin.ts`,
    `${lowerBaseName}.module.scss`,
    'config.ts',
    'skin.ts',
    'index.tsx',
  ];
}

/**
 * Check public consumer D-components without imposing the anatomy on kit internals.
 * Missing scan roots and empty directories are ignored so optional app layers remain optional.
 */
export function validateDComponentAnatomy(projectRoot, roots = DEFAULT_ROOTS) {
  const diagnostics = [];

  for (const relativeRoot of roots) {
    const scanRoot = path.resolve(projectRoot, relativeRoot);
    if (!fs.existsSync(scanRoot) || !fs.statSync(scanRoot).isDirectory()) continue;

    const componentDirectories = fs
      .readdirSync(scanRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && PUBLIC_COMPONENT.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    for (const componentName of componentDirectories) {
      const componentDirectory = path.join(scanRoot, componentName);
      const diagnosticPath = path
        .relative(projectRoot, componentDirectory)
        .split(path.sep)
        .join('/');
      const entries = fs.readdirSync(componentDirectory, { withFileTypes: true });
      const files = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
      const sourceMarkers = new Set([
        ...expectedFiles(componentName),
        ...legacyFiles(componentName),
      ]);
      const isPublicImplementation = [...files].some((file) => sourceMarkers.has(file));
      if (!isPublicImplementation) continue;

      for (const expectedFile of expectedFiles(componentName)) {
        if (!files.has(expectedFile)) {
          diagnostics.push(`${diagnosticPath}: expected ${expectedFile}`);
        }
      }

      for (const legacyFile of legacyFiles(componentName)) {
        if (files.has(legacyFile)) {
          diagnostics.push(
            `${diagnosticPath}: legacy duplicate ${legacyFile}; use the canonical anatomy`,
          );
        }
      }
    }
  }

  return diagnostics;
}

export const dComponentAnatomyRoots = DEFAULT_ROOTS;
