import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Textarea } from '../../../src/components/Textarea/Textarea';

test('multiline composition forwards native form props and labels the real field', () => {
    const html = renderToStaticMarkup(
        createElement(Textarea, {
            id: 'message',
            label: 'Message',
            name: 'message',
            form: 'contact',
            className: 'consumer-field',
            value: 'hello',
            rows: 4,
            length: { max: 20 },
            readOnly: true,
            comment: 'Hint',
            'aria-describedby': 'external',
            animate: { idle: { effect: 'glow' } },
        }),
    );
    assert.match(html, /class="[^"]*consumer-field[^"]*"/);
    assert.match(html, /^<div[^>]*data-ui-idle="glow"/);
    assert.doesNotMatch(html, /<textarea[^>]*data-ui-idle/);
    assert.match(html, /role="presentation"/);
    assert.match(html, /<label[^>]*for="message"/);
    assert.match(html, /<textarea[^>]*name="message"[^>]*form="contact"/);
    assert.match(html, /rows="4"/);
    assert.match(html, /maxLength="20"/i);
    assert.match(html, /aria-describedby="external message-comment"/);
    assert.match(html, /5\/20/);
    assert.match(html, />hello<\/textarea>/);
});

test('multiline loading preserves requested skeleton rows and removes native editing', () => {
    const html = renderToStaticMarkup(createElement(Textarea, { loading: true, rows: 2 }));
    assert.doesNotMatch(html, /<textarea/);
    assert.match(html, /role="presentation"/);
    assert.equal((html.match(/\bh_16\b/g) ?? []).length, 2);
});

test('native presets preserve field attributes and route styles to the actual control frame', () => {
    const html = renderToStaticMarkup(
        createElement(Textarea, {
            name: 'draft',
            form: 'composer',
            defaultValue: 'hello',
            rows: 2,
            autoGrow: true,
            autoContinue: () => null,
            preset: {
                p: [
                    [4, 8],
                    [4, 8],
                    [4, 8],
                ],
                fontSize: [14, 14, 14],
                states: { disabled: { opacity: 0.4 }, error: { borderC: ['red', 'red', 'red'] } },
            },
            slots: { attachments: 'Attachment', actions: 'Send' },
        }),
    );
    assert.match(html, /data-ui-preset-field=""/);
    assert.match(html, /<textarea[^>]*name="draft"[^>]*form="composer"/);
    assert.match(html, />hello<\/textarea>/);
    assert.match(html, /Attachment/);
    assert.match(html, /Send/);
    assert.match(html, /--preset-d-base-font-size:/);
    assert.doesNotMatch(html, /\s(?:preset|states|autoGrow|autoContinue|fontSize)=/i);
});
