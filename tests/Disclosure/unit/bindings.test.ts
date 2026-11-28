import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type MouseEvent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  defineDisclosure,
  DisclosureScope,
  useDisclosure,
  useDisclosureItem,
  type DisclosureItemProps,
  type DisclosureProps,
} from '../../../src/core/Disclosure';

const definition = defineDisclosure({
  defaults: {
    headingAs: 'h3',
    collapsible: true,
    dir: ['column', 'column', 'column'],
    item: {
      dir: ['column', 'column', 'column'],
      trigger: {
        w: ['100%', '100%', '100%'],
        justifyContent: ['space_between', 'space_between', 'space_between'],
        textAlign: ['start', 'start', 'start'],
      },
    },
  },
  navigation: { axis: 'vertical', loop: true },
});

type Bindings = ReturnType<typeof useDisclosureItem>;

function readBindings(group: DisclosureProps, props: DisclosureItemProps): Bindings {
  const snapshot: { item?: Bindings } = {};
  function Item() {
    snapshot.item = useDisclosureItem(definition, props);
    return null;
  }
  function Group() {
    const disclosure = useDisclosure(definition, group);
    return createElement(DisclosureScope, { disclosure, children: createElement(Item) });
  }

  renderToStaticMarkup(createElement(Group));
  assert.ok(snapshot.item);
  return snapshot.item;
}

function click() {
  return {
    defaultPrevented: false,
    currentTarget: {},
    preventDefault() { this.defaultPrevented = true; },
  } as MouseEvent<HTMLButtonElement>;
}

test('trigger settings compose with disclosure and a synchronous cancellation leaves control with the caller', () => {
  const intents: string[] = [];
  const callback = Promise.resolve('done');
  const item = readBindings({ value: null, onValueChange: key => intents.push(key ?? 'closed') }, {
    value: 'delivery',
    trigger: {
      content: 'Delivery',
      w: [180, null, 'auto'],
      justifyContent: ['end', null, 'start'],
      textAlign: ['right', null, 'left'],
      onClick(event) {
        intents.push('click');
        event.preventDefault();
        return callback;
      },
    },
    panelProps: { dir: ['row', null, 'row_reverse'] },
  });

  assert.deepEqual(item.trigger.w, [180, '100%', 'auto']);
  assert.deepEqual(item.trigger.justifyContent, ['end', 'space_between', 'start']);
  assert.deepEqual(item.trigger.textAlign, ['right', 'start', 'left']);
  assert.deepEqual(item.panel.dir, ['row', 'column', 'row_reverse']);
  assert.equal(item.trigger.onClick(click()), callback);
  assert.deepEqual(intents, ['click']);
  assert.equal(item.panel.collapse.keepMounted, true);

  item.panel.collapse.onFound();
  assert.deepEqual(intents, ['click', 'delivery']);
  assert.equal(item.trigger['aria-expanded'], false);
});

test('an available trigger runs the caller and reports the next controlled keys', () => {
  const intents: string[] = [];
  const item = readBindings({ multiple: true, value: ['one'], onValueChange: keys => intents.push(keys.join(',')) }, {
    value: 'two',
    trigger: { content: 'Second', onClick: () => intents.push('click') },
  });

  item.trigger.onClick(click());
  assert.deepEqual(intents, ['click', 'one,two']);
  assert.equal(item.trigger['aria-expanded'], false);
});
