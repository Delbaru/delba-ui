import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../../../src/components/Button';
import { Flex } from '../../../src/components/Flex';
import { ScrollArea } from '../../../src/components/ScrollArea';
import { Section } from '../../../src/components/Section';

const render = renderToStaticMarkup;

test('shared surface preserves the native button and disabled anchor contract', () => {
    assert.match(render(createElement(Button, null, 'Save')), /<button[^>]*type="button"/);
    const link = render(createElement(Button, { href: 'https://example.test', disabled: true }, 'Go'));
    assert.match(link, /^<a\b/);
    assert.doesNotMatch(link, / href=/);
    assert.match(link, /tabindex="-1"/);
    assert.match(link, /aria-disabled="true"/);
});

test('motion-free Flex adds no decoration or wrapper DOM', () => {
    const html = render(createElement(Flex, { as: 'section', display: ['block', 'block', 'block'] }, 'Details'));
    assert.match(html, /^<section\b[^>]*>Details<\/section>$/);
    assert.doesNotMatch(html, /data-ui-collapse-layout/);
});

test('Button and Flex share the same rise and glow bindings', () => {
    const animate = { hover: { effect: 'rise' }, idle: { effect: 'glow' } } as const;
    const examples = [
        createElement(Button, { animate }, 'Content'),
        createElement(Flex, { animate }, 'Content'),
    ];
    for (const element of examples) {
        const html = render(element);
        assert.match(html, /data-ui-hover="rise"/);
        assert.match(html, /data-ui-idle="glow"/);
        assert.equal(html.match(/data-reveal-skip=""/g)?.length, 2);
    }
});

test('disabled surfaces omit idle layers and preserve authored descriptions', () => {
    const html = render(createElement(Button, {
        disabled: true,
        animate: { idle: { effect: 'glow' } },
        'aria-describedby': 'help',
        ui: { popup: { preset: 'tooltip', text: 'Details' } },
    }, 'Save'));
    assert.doesNotMatch(html, /data-ui-idle|data-reveal-skip|data-ui-popup-trigger/);
    assert.match(html, /aria-describedby="help"/);
});


test('an empty tooltip adds neither popup attributes nor a ghost focus stop', () => {
    const html = render(createElement(Flex, {
        ui: { popup: { preset: 'tooltip', text: null } },
    }, 'Content'));
    assert.doesNotMatch(html, /tabindex=|data-ui-popup-trigger|aria-describedby=/);
});


test('ScrollArea retains nested scrollbar settings unless a top-level override is supplied', () => {
    const ui = { scroll: { preset: 'feed', scrollbar: { autoHide: false, width: 3 } } } as const;
    const inherited = render(createElement(ScrollArea, { ui }, 'Content'));
    assert.match(inherited, /--ui-scrollbar-rest-opacity:1/);
    assert.match(inherited, /--ui-scrollbar-width:calc\(3 \* var\(--rpx\)\)/);
    const override = render(createElement(ScrollArea, { ui, scrollbar: { width: 4 } }, 'Content'));
    assert.match(override, /--ui-scrollbar-width:calc\(4 \* var\(--rpx\)\)/);
});


test('Section delegates its semantic host and HTML content to Flex', () => {
    const ordinary = render(createElement(Section, { id: 'intro' }, 'Introduction'));
    assert.match(ordinary, /^<section\b[^>]*id="intro"[^>]*>Introduction<\/section>$/);
    const html = render(createElement(Section, {
        dangerouslySetInnerHTML: { __html: '<p>Introduction</p>' },
    }));
    assert.match(html, /^<section\b[^>]*><p>Introduction<\/p><\/section>$/);
});
