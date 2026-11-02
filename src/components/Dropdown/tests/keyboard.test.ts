import assert from 'node:assert/strict';
import test from 'node:test';
import type { KeyboardEvent } from 'react';
import { dropdownKeyboard } from '../Dropdown.keyboard';

class MenuNode {
  children: MenuNode[] = [];
  editable = false;
  hidden = false;
  ownerDocument = { defaultView: { HTMLElement: MenuNode } };
  contains(node: unknown): boolean { return node === this || this.children.includes(node as MenuNode); }
  querySelectorAll() { return this.children; }
  closest() { return this.hidden ? this : null; }
  getClientRects() { return [1]; }
  matches() { return this.editable; }
}
function setup(key: string, { open = true, mode = 'menu', atTrigger = false, shiftKey = false }: { open?: boolean; mode?: 'menu' | 'content'; atTrigger?: boolean; shiftKey?: boolean } = {}) {
  const trigger = new MenuNode();
  const panel = new MenuNode();
  const first = new MenuNode();
  const last = new MenuNode();
  panel.children = [first, last];
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
