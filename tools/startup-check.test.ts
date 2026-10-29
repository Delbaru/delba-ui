import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRenderedFont, checkStartup } from './startup-check.mjs';

test('startup audit rejects a system fallback even when preload and CSS font names exist', () => {
    assert.throws(() => assertRenderedFont('h1', 'Cormorant Garamond', [{ familyName: 'Times New Roman', isCustomFont: false }]), /expected custom Cormorant Garamond/);
    assertRenderedFont('h1', 'Cormorant Garamond', [{ familyName: 'Cormorant Garamond Light', isCustomFont: true }]);
});

test('startup audit rejects invalid targets and budgets before launching a browser', async () => {
    await assert.rejects(checkStartup([]), /Usage/);
    await assert.rejects(checkStartup(['--url', 'file:///private']), /HTTP/);
    await assert.rejects(checkStartup(['--url', 'https://example.test', '--max-cls', '-1']), /Invalid --max-cls/);
});
