import assert from 'node:assert/strict';
import test from 'node:test';
import { iconStyles } from '../Icon.config';

test('zero widths and angles remain explicit CSS values', () => {
  const styles = iconStyles.resolve({ rotate: 0, strokeWidth: 0 });
  assert.equal(styles.rotation?.['--rotate-d'], '0deg');
  assert.equal(styles.rotation?.['--rotate-m'], '0deg');
  assert.equal(styles.strokeWidths?.['--icon-stroke-width'], '0px');
});

test('responsive paint retains omitted breakpoints and string units', () => {
  const styles = iconStyles.resolve({ rotate: [30, null, '0.5turn'], strokeWidth: [2, '0.1em', null], fill: 'currentColor' });
  assert.equal(styles.rotation?.['--rotate-d'], '30deg');
  assert.equal(styles.rotation?.['--rotate-m'], undefined);
  assert.equal(styles.rotation?.['--rotate-t'], '0.5turn');
  assert.equal(styles.strokeWidths?.['--icon-stroke-width-m'], '0.1em');
  assert.equal(styles.strokeWidths?.['--icon-stroke-width-t'], undefined);
  assert.equal(styles.paint.fill, 'currentColor');
});

test('unconfigured geometry emits no overrides', () => {
  const styles = iconStyles.resolve({});
  assert.equal(styles.rotation, undefined);
  assert.equal(styles.strokeWidths, undefined);
  assert.deepEqual(styles.paint, {});
});
