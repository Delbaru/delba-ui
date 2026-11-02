import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFloatingPortalHost } from '../useFloatingSurface';

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
