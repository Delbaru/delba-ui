import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFloatingPortalHost } from '../useFloatingSurface';
import { floatingAnchorRect } from '../useAnchoredFloating';

test('a virtual point changes geometry without replacing the real context element', () => {
  const rect = { top: 100, bottom: 140, left: 20, right: 100, width: 80, height: 40 };
  assert.equal(floatingAnchorRect(rect), rect);
  assert.deepEqual(floatingAnchorRect(rect, { x: 0, y: 0 }), {
    top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0,
  });
  assert.deepEqual(floatingAnchorRect(rect, { x: 750, y: 600 }), {
    top: 600, bottom: 600, left: 750, right: 750, width: 0, height: 0,
  });
  assert.equal(rect.width, 80);
});

test('floating portal host stays inside the nearest modal document tree', () => {
  const modalParent = {} as HTMLElement;
  const modal = { parentElement: modalParent } as HTMLElement;
  const body = {} as HTMLElement;
  const anchor = {
    closest: () => modal,
    ownerDocument: { body },
  } as unknown as HTMLElement;

  assert.equal(resolveFloatingPortalHost(anchor), modalParent);
});

test('floating portal host falls back to the anchor owner document body', () => {
  const body = {} as HTMLElement;
  const anchor = {
    closest: () => null,
    ownerDocument: { body },
  } as unknown as HTMLElement;

  assert.equal(resolveFloatingPortalHost(anchor), body);
  assert.equal(resolveFloatingPortalHost(null), null);
});
