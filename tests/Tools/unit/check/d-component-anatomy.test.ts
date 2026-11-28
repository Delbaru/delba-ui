import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { validateDComponentAnatomy } from '../../../../tools/check/d-component-anatomy.mjs';

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
    return directory;
}

const anatomy = (name: string) => [`${name}.tsx`, `${name}.module.scss`, 'index.ts'];

test('public D-component requires three files with local props and typed presets in TSX', () => {
    withProject((root) => {
        const directory = createComponent(root, 'DInput', anatomy('DInput'));
        fs.writeFileSync(
            path.join(directory, 'DInput.tsx'),
            `
      import { Input, type InputProps, type InputPresets } from '@delba/frontend';
      export interface DInputProps extends Omit<InputProps, 'preset'> { preset?: keyof typeof presets; }
      const presets = { regular: { h: [32,32,32] }, compact: { h: [28,28,28] } } satisfies InputPresets;
      export function DInput({preset = 'regular', ...props}: DInputProps) {
        return <Input preset={presets[preset]} {...props} />;
      }
    `,
        );
        assert.deepEqual(validateDComponentAnatomy(root), []);
    });
});

test('replaced config, types and skin transits are rejected rather than required', () => {
    withProject((root) => {
        createComponent(root, 'DInput', [
            ...anatomy('DInput'),
            'DInput.config.ts',
            'DInput.types.ts',
            'DInput.skin.ts',
        ]);
        const diagnostics = validateDComponentAnatomy(root);
        for (const file of ['DInput.config.ts', 'DInput.types.ts', 'DInput.skin.ts']) {
            assert.ok(diagnostics.some((message) => message.includes(`legacy duplicate ${file}`)));
            assert.ok(!diagnostics.some((message) => message.endsWith(`expected ${file}`)));
        }
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

test('CMS root is checked while unrelated D-prefixed folders stay out of scope', () => {
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

test('incomplete component and lowercase transit files produce actionable diagnostics', () => {
    withProject((root) => {
        createComponent(root, 'DButton', [
            'DButton.tsx',
            'config.ts',
            'skin.ts',
            'types.ts',
            'index.tsx',
        ]);
        const diagnostics = validateDComponentAnatomy(root);
        assert.ok(diagnostics.includes('src/shared/ui/DButton: expected DButton.module.scss'));
        assert.ok(diagnostics.includes('src/shared/ui/DButton: expected index.ts'));
        for (const file of ['config.ts', 'skin.ts', 'types.ts', 'index.tsx']) {
            assert.ok(diagnostics.some((message) => message.includes(`legacy duplicate ${file}`)));
        }
    });
});

test('six local presets are allowed; states and composite slots are not extra presets', () => {
    withProject((root) => {
        const directory = createComponent(root, 'DButton', anatomy('DButton'));
        fs.writeFileSync(
            path.join(directory, 'DButton.tsx'),
            `
      const presets = {
        a: { button: { preset: 'secondary' }, icon: { preset: 'control' } },
        b: { states: { hover: {}, active: {}, disabled: {} } },
        c: {}, d: {}, e: {}, f: {},
      } as const satisfies ButtonPresets;
    `,
        );
        assert.deepEqual(validateDComponentAnatomy(root), []);
        fs.appendFileSync(
            path.join(directory, 'DButton.tsx'),
            'const extraPresets = { seventh: {} };',
        );
        assert.ok(
            validateDComponentAnatomy(root).some((message) =>
                message.includes('7 локальных визуальных пресетов; максимум 6')),
        );
    });
});

test('render-local maps, style indirection, helpers and split source imports are rejected', () => {
    withProject((root) => {
        const directory = createComponent(root, 'DBox', anatomy('DBox'));
        fs.writeFileSync(
            path.join(directory, 'DBox.tsx'),
            `
      import { DBoxProps } from './DBox.types';
      const presets = { panel: { ...common, h: sizes.md } };
      export function DBox() { const localPresets = makePresets(); return useSkin(AXES); }
    `,
        );
        const diagnostics = validateDComponentAnatomy(root);
        for (const message of [
            'config/types/skin',
            'style-спреды',
            'таблицу common',
            'таблицу sizes',
            'уровне модуля',
            'обычным локальным объектом',
            'useSkin',
            'AXES',
        ]) {
            assert.ok(
                diagnostics.some((diagnostic) => diagnostic.includes(message)),
                message,
            );
        }
    });
});

test('genuine private mechanisms and composed part folders do not require fake transits', () => {
    withProject((root) => {
        const directory = createComponent(root, 'DSelect', [
            ...anatomy('DSelect'),
            'useSelection.ts',
        ]);
        fs.mkdirSync(path.join(directory, 'Trigger'));
        for (const file of ['Trigger.tsx', 'Trigger.module.scss', 'index.ts']) {
            fs.writeFileSync(path.join(directory, 'Trigger', file), '');
        }
        assert.deepEqual(validateDComponentAnatomy(root), []);
    });
});
