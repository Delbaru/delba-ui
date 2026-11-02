import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateDComponentAnatomy } from '../d-component-anatomy.mjs';

function withProject(run: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-d-anatomy-'));
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function createComponent(root: string, name: string, files: string[]) {
  const directory = path.join(root, 'src/shared/ui', name);
  fs.mkdirSync(directory, { recursive: true });
  for (const file of files) fs.writeFileSync(path.join(directory, file), '');
}

const anatomy = (name: string) => [
  `${name}.tsx`,
  `${name}.config.ts`,
  `${name}.skin.ts`,
  `${name}.module.scss`,
  'index.ts',
];

test('public D-component directory requires the exact five-file anatomy', () => {
  withProject((root) => {
    createComponent(root, 'DInput', anatomy('DInput'));
    assert.deepEqual(validateDComponentAnatomy(root), []);
  });
});

test('empty directories and absent optional consumer roots are ignored', () => {
  withProject((root) => {
    fs.mkdirSync(path.join(root, 'src/shared/ui/DEmpty'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src/shared/ui/core/helper'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src/shared/ui/DHelper'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/shared/ui/DHelper/helpers.ts'), '');
    assert.deepEqual(validateDComponentAnatomy(root), []);
  });
});

test('CMS public root is checked while unrelated D-prefixed folders stay out of scope', () => {
  withProject((root) => {
    fs.mkdirSync(path.join(root, 'src/cms/ui/DTextarea'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/cms/ui/DTextarea/DTextarea.tsx'), '');
    fs.mkdirSync(path.join(root, 'src/other/ui/DCard'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/other/ui/DCard/DCard.tsx'), '');

    const diagnostics = validateDComponentAnatomy(root);
    assert.ok(diagnostics.some((message) => message.startsWith('src/cms/ui/DTextarea:')));
    assert.ok(diagnostics.every((message) => !message.includes('src/other/ui')));
  });
});

test('incomplete public component and legacy duplicate sources produce actionable diagnostics', () => {
  withProject((root) => {
    createComponent(root, 'DButton', [
      'DButton.tsx',
      'DButton.config.ts',
      'DButton.skin.ts',
      'config.ts',
      'skin.ts',
      'index.tsx',
    ]);
    const diagnostics = validateDComponentAnatomy(root);
    assert.ok(diagnostics.includes('src/shared/ui/DButton: expected DButton.module.scss'));
    assert.ok(diagnostics.includes('src/shared/ui/DButton: expected index.ts'));
    assert.ok(diagnostics.some((message) => message.includes('legacy duplicate config.ts')));
    assert.ok(diagnostics.some((message) => message.includes('legacy duplicate skin.ts')));
    assert.ok(diagnostics.some((message) => message.includes('legacy duplicate index.tsx')));
  });
});
