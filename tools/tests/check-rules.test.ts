import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { RULES, countViolations } from '../check-rules.mjs';

const hit = (rule: keyof typeof RULES, line: string) => {
  const def = RULES[rule] as { test?: (line: string) => boolean };
  return def.test?.(line) ?? false;
};

test('consumer marker guard follows real class values without banning utility or vendor contracts', () => {
  const count = RULES['global-component-class'].ast.count;
  const invalid = [
    `const card = <Flex className={cx(styles.Card, 'Card')} />;`,
    `const classes = ['Card', enabled && 'CardBody']; const card = <Flex className={classes.filter(Boolean).join(' ')} />;`,
    `node.classList.add('Card');`,
    `const card = <Flex className={\`cms-theme \${styles.Card || 'Card'}\`} />;`,
    `const props = { panelClassName: styles.Panel ?? 'Panel' };`,
    `const card = <Flex className="Card" />;`,
    `node.className = enabled ? 'Card' : styles.Card;`,
  ];
  for (const text of invalid) assert.ok(count(text, 'Consumer.tsx').length > 0, text);
  const valid = `
    import { cx as combine } from '@delba/ui';
    const classes = ['ui-flex', 'cms-theme', 'sk_primary', 'swiper-slide', 'fancybox__container', styles.Card];
    const card = <Flex className={combine(classes, className, enabled && styles.Active)} />;
    const themed = <Flex className={\`cms-\${mode || 'Default'} ui-panel\`} />;
    const heading = 'Card';
    const text = <Text title="Card">Card</Text>;
    node.classList.add('ui-flex', 'cms-theme', styles.Card);
  `;
  assert.deepEqual(count(valid, 'Consumer.tsx'), []);
  assert.ok(count(`import { cx as combine } from '@delba/ui'; combine('Card', styles.Card);`, 'Consumer.ts').length > 0);
  for (const file of ['Consumer.js', 'Consumer.jsx', 'Consumer.mjs', 'Consumer.cjs']) {
    assert.equal(count(`const classes = ['Card']; const props = { className: classes.join(' ') };`, file).length, 1, file);
  }
});

test('new consumer marker rule is zero by default across scanned folders, including model files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-marker-'));
  try {
    fs.mkdirSync(path.join(dir, 'cms', 'ui'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'cms', 'ui', 'Card.model.ts'), `export const props = { className: ['Card', styles.Card].join(' ') };`);
    fs.writeFileSync(path.join(dir, 'Theme.tsx'), `const node = <Flex className="cms-theme ui-flex sk_primary swiper-slide" />;`);
    const { counts } = countViolations([dir]);
    assert.deepEqual(Object.values(counts['global-component-class'] ?? {}), [1]);
    assert.equal(Object.keys(counts['global-component-class'] ?? {}).some((file) => file.endsWith('Card.model.ts')), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('marker rule cannot be adopted or raised through a legacy baseline or --update', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-marker-zero-'));
  try {
    const source = path.join(dir, 'Card.tsx');
    const baselineFile = path.join(dir, 'baseline.json');
    fs.writeFileSync(source, `const card = <Flex className="Card" />;`);
    const baseline = Object.fromEntries(Object.keys(RULES).filter(rule => rule !== 'global-component-class').map(rule => [rule, {}]));
    const original = JSON.stringify(baseline);
    fs.writeFileSync(baselineFile, original);
    const command = fileURLToPath(new URL('../check-rules.mjs', import.meta.url));
    const run = (extra: string[] = []) => spawnSync(process.execPath, [command, '--baseline', baselineFile, ...extra, source], { cwd: dir, encoding: 'utf8' });
    const absent = run();
    assert.equal(absent.status, 1, absent.stdout + absent.stderr);
    assert.match(absent.stderr, /global-component-class/);
    assert.equal(fs.readFileSync(baselineFile, 'utf8'), original);
    fs.writeFileSync(baselineFile, JSON.stringify({ ...baseline, 'global-component-class': { 'Card.tsx': 10 } }));
    assert.equal(run().status, 1);
    const beforeUpdate = fs.readFileSync(baselineFile, 'utf8');
    assert.equal(run(['--update']).status, 1);
    assert.equal(fs.readFileSync(baselineFile, 'utf8'), beforeUpdate);
    fs.writeFileSync(source, `const card = <Flex className={styles.Card} />;`);
    assert.equal(run().status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('client CMS labels do not require an appearance animation', () => {
  const count = RULES['unanimated-conditional'].ast.count;
  assert.equal(
    count(
      `'use client';
        function Button({ text }: { text?: string }) {
            const label = text || undefined;
            const hasLabel = !!label;
            return <Flex>{label && (<Text>{label}</Text>)}{hasLabel && <Text>Label exists</Text>}</Flex>;
        }`,
      'Button.tsx',
    ).length,
    0,
  );
});

test('reactive and controlled conditional JSX is detected regardless of formatting', () => {
  const count = RULES['unanimated-conditional'].ast.count;
  for (const child of [
    'visible && (<Text>Panel</Text>)',
    'visible && <Text>Panel</Text>',
    'visible ? <Text>Panel</Text> : null',
  ]) {
    assert.equal(
      count(
        `import { useState as state } from 'react';
            function Panel() { const [open] = state(false); const visible = open; return <Flex>{${child}}</Flex>; }
        `,
        'Panel.tsx',
      ).length,
      1,
    );
  }
  assert.equal(
    count(
      'function Panel({ open }: { open: boolean }) { return <Flex>{open && <Text>Panel</Text>}</Flex>; }',
      'Panel.tsx',
    ).length,
    1,
  );
});

test('thin line sizes are allowed while spacing still follows the four-unit rhythm', () => {
  const count = RULES['off-grid-number'].count;
  assert.equal(count('<Box h={[1, 1, 1]} w={[2, 2, 2]} />'), 0);
  assert.equal(count('<Flex p={[1, 1, 1]} gap={[2, 2, 2]} />'), 2);
  assert.equal(count('<Box h={[3, 3, 3]} />'), 1);
});

test('проп раньше SCSS: нулевые поля, flex: none, переопределение токена темы', () => {
  assert.equal(hit('scss-zero-spacing', '    margin: 0;'), true);
  assert.equal(hit('scss-zero-spacing', '    padding-top: 0;'), true);
  assert.equal(hit('scss-zero-spacing', '    margin: 0 auto;'), false);
  assert.equal(hit('scss-flex-none', '    flex: none;'), true);
  assert.equal(hit('scss-flex-none', '    flex: 1;'), false);
  assert.equal(hit('scss-theme-rescope', '    --text: var(--black);'), true);
  assert.equal(
    hit('scss-theme-rescope', '    --guide-line: linear-gradient(var(--guide), var(--guide));'),
    false,
  );
});

test('отступ между соседями — gap, значение — литерал на месте', () => {
  assert.equal(hit('margin-between', '<Grid columns={[2, 1, 1]} mt={[48, 32, 40]}>'), true);
  assert.equal(hit('margin-between', '<Grid ml={[0, 0, 0]}>'), false);
  assert.equal(hit('const-tuple', '<Flex borderT={[LINE, LINE, LINE]}>'), true);
  assert.equal(hit('const-tuple', '<Flex borderT={LINE}>'), true);
  assert.equal(hit('const-tuple', '<Flex className={styles.Programs} gap={[8, 8, 8]}>'), false);
});

test('пустой стиль допускается, а реальный стиль требует корневой класс компонента', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
  fs.writeFileSync(
    path.join(dir, 'Card.module.scss'),
    '.Card {\n    .photo {overflow: hidden;}\n}\n',
  );
  fs.writeFileSync(
    path.join(dir, 'Box.module.scss'),
    '.skin {\n    transition: var(--t-fast);\n}\n',
  );
  fs.writeFileSync(
    path.join(dir, 'Empty.module.scss'),
    '// Каркас без самостоятельных стилей\n/* ещё один комментарий */\n',
  );
  fs.writeFileSync(path.join(dir, 'AlsoEmpty.module.scss'), '/* .AlsoEmpty { fake: true; } */\n');

  const { counts } = countViolations([dir]);
  const files = Object.keys(counts['module-root-class']).map((file) => path.basename(file));
  assert.deepEqual(files, ['Box.module.scss']);
  fs.rmSync(dir, { recursive: true, force: true });
});


test('component root class may qualify its real semantic element without accepting another selector', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-element-root-'));
  try {
    fs.writeFileSync(path.join(dir, 'TableRow.module.scss'), 'tr.TableRow[data-editing] { padding: 4px; }');
    fs.writeFileSync(path.join(dir, 'Input.module.scss'), 'input.Input:focus { color: red; }');
    fs.writeFileSync(path.join(dir, 'Missing.module.scss'), 'tr.Other { color: red; }');
    fs.writeFileSync(path.join(dir, 'Nested.module.scss'), '.Ancestor .Nested { color: red; }');
    const { counts } = countViolations([dir]);
    assert.deepEqual(Object.keys(counts['module-root-class']).map(file => path.basename(file)).sort(), ['Missing.module.scss', 'Nested.module.scss']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});


test('responsive constants guard ignores native SVG geometry and unrelated component data', () => {
  const count = RULES['const-tuple'].ast.count;
  assert.equal(count('<svg><circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={STROKE} /></svg><DSelect options={OPTIONS} /><DInput accept={ACCEPT} /><Textarea rows={ROWS} />', 'Example.tsx').length, 0);
  assert.equal(count('<Flex gap={GAP} borderT={[LINE, LINE, LINE]} /><Grid columns={COLUMNS} />', 'Example.tsx').length, 3);
  assert.equal(count('<Flex gap={[8, 8, 8]} /><Grid columns={[2, 1, 2]} />', 'Example.tsx').length, 0);
});

test('native hidden file picker is allowed without allowing visible or spread-overridden inputs', () => {
  const count = RULES['raw-input'].ast.count;
  assert.equal(count('<input type="file" hidden multiple /><input type="file" hidden={true} />', 'Example.tsx').length, 0);
  assert.equal(count('<input type="text" hidden /><input type="file" /><input type="file" hidden={false} /><input type="file" hidden {...props} />', 'Example.tsx').length, 4);
  assert.equal(count('const example = "<input />"; // <input />', 'Example.tsx').length, 0);
});


test('declared theme token and native reset owners cannot exempt component CSS', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-style-owner-'));
  try {
    fs.writeFileSync(path.join(dir, 'tokens.scss'), '// @ui-style-owner theme-tokens\n@media (max-width: 767px) { :root { --rpx: 1px; --font-p: 16px; } }');
    fs.writeFileSync(path.join(dir, 'globals.scss'), '// @ui-style-owner native-reset\nbody {\n margin: 0;\n}\ninput[type="number"]::-webkit-inner-spin-button {\n margin: 0;\n}');
    fs.writeFileSync(path.join(dir, 'bad.scss'), '// @ui-style-owner theme-tokens\n@media (max-width: 767px) { :root { --rpx: 1px; } .Card { padding: 8px; } }');
    fs.writeFileSync(path.join(dir, 'bad-reset.scss'), '// @ui-style-owner native-reset\n.Card {\n margin: 0;\n}');
    fs.writeFileSync(path.join(dir, 'Component.module.scss'), '// @ui-style-owner native-reset\nbody {\n margin: 0;\n}');
    const { counts } = countViolations([dir]);
    assert.deepEqual(Object.keys(counts['media-query']).map(file => path.basename(file)), ['bad.scss']);
    assert.deepEqual(Object.keys(counts['scss-zero-spacing']).map(file => path.basename(file)).sort(), ['Component.module.scss', 'bad-reset.scss']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test('conditional JSX respects direct and keyed layout ownership, not unrelated or opaque ancestors', () => {
  const count = RULES['unanimated-conditional'].ast.count;
  const wrap = body => 'function Panel({open}: {open: boolean}) {return (' + body + ');}';
  for (const body of [
    '<Flex>{open && <Text animate={{when:"load",effect:"fade"}}>Panel</Text>}</Flex>',
    '<Flex animate={{when:"change",effect:"fade",key:open}}><Flex>{open && <Text>Panel</Text>}</Flex></Flex>',
    '<Flex animate={{when:"change",effect:"fade",key:open}}>{open && <Flex>{open && <Text>Panel</Text>}</Flex>}</Flex>',
    '<Flex animate={{when:"change",effect:"fade",key:open}}>{open && <Text>Panel</Text>}</Flex>',
    '<Flex key={open ? "open" : "closed"} animate={{when:"load",effect:"fade"}}>{open && <Text>Panel</Text>}</Flex>',
  ]) assert.equal(count(wrap(body), 'Panel.tsx').length, 0, body);
  for (const body of [
    '<Flex animate={{when:"inView",effect:"fade"}}>{open && <Text>Panel</Text>}</Flex>',
    '<Flex animate={{when:"change",effect:"fade",key:"constant"}}>{open && <Text>Panel</Text>}</Flex>',
    '<Flex animate={{when:"load",effect:"fade"}}>{open && <Text>Panel</Text>}</Flex>',
    '<Flex animate={{when:"change",effect:"fade",key:open}}><PortalOrCustom>{open && <Text>Panel</Text>}</PortalOrCustom></Flex>',
    '<Flex>{open ? <Text animate={{when:"load",effect:"fade"}}>A</Text> : <Text>B</Text>}</Flex>',
  ]) assert.equal(count(wrap(body), 'Panel.tsx').length, 1, body);
});

test('collapse shorthand open owns a conditional column without exempting an unrelated object', () => {
  const count = RULES['unanimated-conditional'].ast.count;
  const source = `function FooterColumn({ column, expandable, open }: {
    column: { text: string } | null; expandable: boolean; open: boolean;
  }) {
    return <Flex>{column && expandable && (
      <Flex collapse={{ open, fade: true }}><Text>{column.text}</Text></Flex>
    )}</Flex>;
  }`;
  assert.equal(count(source, 'FooterColumn.tsx').length, 0);
  assert.equal(count(source.replace('collapse={{ open, fade: true }}', 'collapse={{ fade: true }}'), 'FooterColumn.tsx').length, 1);
  assert.equal(count(source.replace('collapse={{ open, fade: true }}', 'data-state={{ open, fade: true }}'), 'FooterColumn.tsx').length, 1);
});


test('a native range owner is declared, styled and rooted; ordinary range inputs remain forbidden', () => {
  const count = RULES['raw-input'].ast.count;
  const owner = '// @ui-native-control range\nimport styles from "./Range.module.scss"; export function Range() {return <Flex className={styles.Range}><input type="range" min={1} max={12} value={value} onChange={change} /></Flex>;}';
  assert.equal(count(owner, 'Range.tsx').length, 0);
  assert.equal(count(owner + 'function Other(){return <input type="range" min={1} max={12} value={value} onChange={change} />;}', 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('className={styles.Range}', 'className="Range"'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('styles.Range', 'styles.Other'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('Range()', 'Range(styles)'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('styles.Range', 'styles["Range"]'), 'Range.tsx').length, 0);
  assert.equal(count(owner.replace('type="range"', 'type="text"'), 'Range.tsx').length, 1);
  assert.equal(count(owner.replace('import styles from "./Range.module.scss";', ''), 'Range.tsx').length, 1);
  assert.equal(count('<input type="range" min={1} max={12} value={value} onChange={change} />', 'Page.tsx').length, 1);
});


test('a shared hook-derived identity remains a motion key without expanding away its binding', () => {
  const text = 'function Inbox(){ const active = useSelection(); return <Flex animate={{when:"change",effect:"fade",key:active ? active.id : "empty"}}>{active ? <Text>Selected</Text> : <Text>Empty</Text>}</Flex>;}';
  assert.equal(RULES['unanimated-conditional'].ast.count(text, 'Inbox.tsx').length, 0);
});

test('motion keys ignore builtin undefined but preserve a shadowed parameter dependency', () => {
  const count = RULES['unanimated-conditional'].ast.count;
  const body = '<Flex key={`${editing}:${kind}`} animate={{when:"load",effect:"fade"}}>{!editing && kind === undefined && <Text>Create</Text>}</Flex>';
  assert.equal(count('function Panel({editing,kind}:{editing:boolean;kind?:string}){return '+body+';}', 'Panel.tsx').length, 0);
  assert.equal(count('function Panel({editing,kind}:{editing:boolean;kind?:string}, undefined:string){return '+body+';}', 'Panel.tsx').length, 1);
});

test('a declared portal owner resolves aliases and exports to Modal, without hiding conditional unmounts', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-motion-owner-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (name: string, text: string) => fs.writeFileSync(path.join(dir, name), text);
  write('dialog.tsx', 'import {Modal as KitModal} from "@delba/ui"; export function Dialog({open}){return <KitModal open={open}/>;}');
  const owner = 'import {Dialog as RealDialog} from "./dialog";\n/** @ui-motion-owner open */\nexport function Crop({open}){return <><RealDialog open={open}/></>;}';
  write('owner.tsx', owner);
  write('barrel.ts', 'export {Crop as Owned} from "./owner";');
  const count = (body: string, parameters = '') => RULES['unanimated-conditional'].ast.count(
    'import {Owned as Layer} from "./barrel"; function Scene('+parameters+'){const file=useFile();return <Flex>'+body+'</Flex>;}', path.join(dir, 'Scene.tsx'),
  ).length;
  assert.equal(count('{file.asset && <Layer open={file.open}/>}'), 0);
  assert.equal(count('{file.open && <Layer open={file.open}/>}'), 1, 'visibility cannot unmount its portal before exit');
  assert.equal(count('{file.asset && <Layer/>}'), 1, 'open must be explicit at the call site');
  assert.equal(count('{file.asset && <Layer open={file.open} {...override}/>}'), 1);
  assert.equal(count('{file.asset && <Layer open={file.open}/>}','Layer:any'), 1, 'a shadowed component is not the imported owner');
  write('owner.tsx', owner.replace('/** @ui-motion-owner open */', ''));
  assert.equal(count('{file.asset && <Layer open={file.open}/>}'), 1);
  write('owner.tsx', owner);
  write('dialog.tsx', 'export function Dialog({open}){return <Flex open={open}/>;}');
  assert.equal(count('{file.asset && <Layer open={file.open}/>}'), 1, 'an identically named local dialog is not Modal');
});
