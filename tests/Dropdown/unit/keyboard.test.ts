import assert from 'node:assert/strict';
import test from 'node:test';
import type { KeyboardEvent } from 'react';
import { dropdownKeyboard } from '../../../src/components/Dropdown/Dropdown.keyboard';

class MenuNode {
  children: MenuNode[] = [];
  parent: MenuNode | null = null;
  panel = false;
  editable = false;
  disabled = false;
  ariaDisabled = false;
  hidden = false;
  ownerDocument = { defaultView: { Element: MenuNode } };

  append(...nodes: MenuNode[]) {
    for (const node of nodes) node.parent = this;
    this.children.push(...nodes);
  }

  contains(node: unknown): boolean {
    return node === this || this.children.some(child => child.contains(node));
  }

  querySelectorAll(): MenuNode[] {
    return this.children.flatMap(child => child.panel ? child.querySelectorAll() : [child]);
  }

  closest(selector: string): MenuNode | null {
    if (selector === '[data-dropdown-ancestors]' && this.panel) return this;
    if (selector === '[hidden], [inert]' && this.hidden) return this;
    if (selector.startsWith('input, textarea') && this.editable) return this;
    return this.parent?.closest(selector) ?? null;
  }

  getAttribute(name: string) {
    return name === 'aria-disabled' && this.ariaDisabled ? 'true' : null;
  }

  getClientRects() { return [1]; }
  matches(selector: string) { return selector === ':disabled' && this.disabled; }
}
function setup(key: string, { open = true, mode = 'menu', atTrigger = false, shiftKey = false }: { open?: boolean; mode?: 'menu' | 'content'; atTrigger?: boolean; shiftKey?: boolean } = {}) {
  const trigger = new MenuNode();
  const panel = new MenuNode();
  const first = new MenuNode();
  const last = new MenuNode();
  panel.panel = true;
  panel.append(first, last);
  const target = atTrigger ? trigger : first;
  const event = { key, shiftKey, currentTarget: panel, target } as unknown as KeyboardEvent<HTMLElement>;
  const scope = { open, mode, blocked: false, trigger: trigger as unknown as HTMLElement, panel: panel as unknown as HTMLElement };
  return { event, scope, first, last, target };
}

test('content widgets keep their arrow keys and Tab policy', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab']) {
    const { event, scope } = setup(key, { mode: 'content' });
    assert.equal(dropdownKeyboard.command(event, scope), undefined);
  }
});
test('closed trigger arrows request the appropriate menu edge', () => {
  const down = setup('ArrowDown', { open: false, atTrigger: true });
  const up = setup('ArrowUp', { open: false, atTrigger: true });
  assert.deepEqual(dropdownKeyboard.command(down.event, down.scope), { action: 'open', edge: 'first' });
  assert.deepEqual(dropdownKeyboard.command(up.event, up.scope), { action: 'open', edge: 'last' });
});
test('menu navigation wraps and Home/End choose visible controls', () => {
  const { event, scope, last } = setup('ArrowUp');
  assert.deepEqual(dropdownKeyboard.command(event, scope), { action: 'focus', target: last });
  event.key = 'End';
  assert.deepEqual(dropdownKeyboard.command(event, scope), { action: 'focus', target: last });
});
test('editable menu content retains its own arrow input', () => {
  const { event, scope, target } = setup('ArrowDown');
  target.editable = true;
  assert.equal(dropdownKeyboard.command(event, scope), undefined);
});
test('forward Tab enters an open menu but Shift+Tab remains native', () => {
  const forward = setup('Tab', { atTrigger: true });
  const backward = setup('Tab', { atTrigger: true, shiftKey: true });
  assert.deepEqual(dropdownKeyboard.command(forward.event, forward.scope), { action: 'focus', target: forward.first });
  assert.equal(dropdownKeyboard.command(backward.event, backward.scope), undefined);
});

test('migrated context menu navigation retains both edges, wrap and foreign-key behavior', () => {
  const { event, scope, first, last } = setup('ArrowDown');
  for (const [key, target, expected] of [
    ['ArrowDown', first, last], ['ArrowDown', last, first], ['ArrowUp', first, last],
    ['Home', last, first], ['End', first, last], ['ArrowDown', scope.panel, first],
    ['ArrowUp', scope.panel, last],
  ] as const) {
    event.key = key;
    Object.assign(event, { target });
    assert.deepEqual(dropdownKeyboard.command(event, scope), { action: 'focus', target: expected });
  }
  event.key = 'Enter';
  assert.equal(dropdownKeyboard.command(event, scope), undefined);
  (scope.panel as unknown as MenuNode).children = [];
  event.key = 'ArrowDown';
  assert.equal(dropdownKeyboard.command(event, scope), undefined);
});

test('menu navigation skips disabled entries and keeps nested panel items in their own menu', () => {
  const { event, scope, first, last } = setup('ArrowDown');
  const panel = scope.panel as unknown as MenuNode;
  const disabled = new MenuNode();
  const ariaDisabled = new MenuNode();
  const nested = new MenuNode();
  const inner = new MenuNode();
  disabled.disabled = true;
  ariaDisabled.ariaDisabled = true;
  nested.panel = true;
  nested.append(inner);
  panel.children = [];
  panel.append(first, disabled, nested, ariaDisabled, last);

  assert.deepEqual(dropdownKeyboard.items(scope.panel), [first, last]);
  assert.deepEqual(dropdownKeyboard.command(event, scope), { action: 'focus', target: last });
  Object.assign(event, { target: inner });
  assert.equal(dropdownKeyboard.command(event, scope), undefined);
});
