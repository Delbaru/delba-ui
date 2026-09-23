import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeRichTextHtml } from './html-sanitize';

const TABLE = '<table><thead><tr><th align="right">a</th></tr></thead><tbody><tr><td align="left">1</td></tr></tbody><tfoot><tr><td>f</td></tr></tfoot></table>';
const EXTRA = '<pre><code>x</code></pre><blockquote>q</blockquote><hr><del>d</del><s>s</s>';
const EVIL = '<p onclick="alert(1)">t</p><script>alert(1)</script><a href="javascript:alert(1)">l</a><img src=x onerror="alert(1)">';

test('sanitizeRichTextHtml: без опции таблица, pre, цитата, черта и зачёркнутое вырезаются, текст остаётся', () => {
    const out = sanitizeRichTextHtml(TABLE + EXTRA);
    assert.doesNotMatch(out, /<(table|thead|tbody|tfoot|tr|th|td|pre|blockquote|hr|del|s)\b/);
    assert.doesNotMatch(out, /align=/);
    assert.match(out, /<code>x<\/code>/);
});

test('sanitizeRichTextHtml: без опции — прежний набор (a, strong, ul/li, h2)', () => {
    const html = '<h2>h</h2><p><strong>b</strong> <a href="https://x.ru" target="_blank" rel="noopener">l</a></p><ul><li>i</li></ul>';
    assert.equal(sanitizeRichTextHtml(html), html);
});

test('sanitizeRichTextHtml { rich: true }: таблица с align, pre, цитата, черта, del и s проходят', () => {
    const out = sanitizeRichTextHtml(TABLE + EXTRA, { rich: true });
    assert.equal(out, TABLE + EXTRA);
});

for (const rich of [false, true]) {
    test(`sanitizeRichTextHtml rich=${rich}: script, on*-атрибуты и javascript: вырезаются`, () => {
        const out = sanitizeRichTextHtml(EVIL, { rich });
        assert.doesNotMatch(out, /script|onclick|onerror|javascript:|<img/i);
        assert.match(out, /<p>t<\/p>/);
    });
}
