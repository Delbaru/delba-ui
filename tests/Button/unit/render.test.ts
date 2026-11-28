import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../../../src/components/Button';
import { TooltipScope } from '../../../src/core/Popup/TooltipScope';

const scoped = { popup: { preset: 'tooltip' as const, scoped: true, text: 'Save help' } };

test('ordinary native titles remain independent of tooltip scope', () => {
    const html = renderToStaticMarkup(
        createElement(Button, { title: 'Save help', font: 'body' }, 'Save'),
    );
    assert.match(html, /title="Save help"/);
    assert.doesNotMatch(html, /\sfont="/);
});

test('an explicitly scoped tooltip suppresses its native title outside the scope', () => {
    const html = renderToStaticMarkup(
        createElement(Button, { title: 'Save help', ui: scoped }, 'Save'),
    );
    assert.doesNotMatch(html, /title="Save help"/);
});

test('an enabled tooltip scope preserves the explicit native title policy', () => {
    const html = renderToStaticMarkup(
        createElement(TooltipScope, {
            children: createElement(Button, { title: 'Save help', ui: scoped }, 'Save'),
        }),
    );
    assert.match(html, /title="Save help"/);
});
