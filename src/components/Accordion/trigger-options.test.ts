import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type ReactNode } from 'react';

import { isAccordionItemTriggerOptions, resolveAccordionItemTrigger } from './trigger-options';

test('recognizes trigger settings without mistaking React elements, arrays, or portals for settings', () => {
    const options = { content: createElement('span', null, 'Trigger'), p: 12 };
    const element = createElement('span', { content: 'element prop' }, 'Trigger');
    const portal = {
        $$typeof: Symbol.for('react.portal'),
        key: null,
        children: 'Portal trigger',
        containerInfo: {},
    } as unknown as ReactNode;

    assert.equal(isAccordionItemTriggerOptions(options), true);
    assert.equal(isAccordionItemTriggerOptions(element), false);
    assert.equal(isAccordionItemTriggerOptions([element, ' trailing']), false);
    assert.equal(isAccordionItemTriggerOptions(portal), false);

    const resolvedOptions = resolveAccordionItemTrigger(options);
    assert.equal(resolvedOptions.content, options.content);
    assert.equal(resolvedOptions.props.p, 12);
    const legacy = [element, ' trailing'];
    const resolvedLegacy = resolveAccordionItemTrigger(legacy);
    assert.equal(resolvedLegacy.content, legacy);
    assert.deepEqual(resolvedLegacy.props, {});
});
