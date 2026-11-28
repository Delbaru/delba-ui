import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { compile } from 'sass';

const frontendSource = path.resolve(import.meta.dirname, '../../../src');

test('native stylesheet declares the cascade order and leaves component rules to their owners', () => {
  const { css } = compile(path.join(frontendSource, 'core/tokens.global.scss'));

  const firstLayer = css.match(/@layer\b[^;{]*/)?.[0];
  assert.equal(firstLayer, '@layer ui.scale, ui.components, ui.utilities, ui.states');
  assert.match(css, /html\[data-ui-loading\]\s*\{/);
  assert.match(css, /\.ui-scrollbar\s*\{/);
  assert.doesNotMatch(css, /\.ui-(?:button|flex|grid|icon|img|section|text|collapse)\b/);
});

test('collapse keeps the closed layout reset above utility props', () => {
  const { css } = compile(path.join(frontendSource, 'core/Collapse/Collapse.module.scss'));
  const stateLayer = css.slice(css.indexOf('@layer ui.states'));

  assert.match(stateLayer, /\.Collapse\[data-axis=['"]?row['"]?\]:not\(\[data-open\]\)\s*>\s*\.Inner:not\(\.Clip\)\s*>\s*\[data-ui-collapse-layout\]/);
  assert.match(stateLayer, /height: 0;\s*padding-block: 0;\s*border-block-width: 0;/);
});

test('content changes animate individual transforms without replacing hover or parallax', () => {
  const { css } = compile(path.join(frontendSource, 'core/Motion/ContentMotion.module.scss'));
  assert.match(css, /translate: 0 calc\(/);
  assert.match(css, /scale: 0\.96/);
  assert.doesNotMatch(css, /(?:^|[;{\s])transform:/);
});
