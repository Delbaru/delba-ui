import assert from 'node:assert/strict';
import test from 'node:test';
import { navigationItems, nextNavigationIndex } from '../../../src/core/Navigation/Navigation';

test('vertical navigation loops, moves to both ends, and enters an unfocused group at its edge', () => {
  const options = { axis: 'vertical', loop: true } as const;
  assert.equal(nextNavigationIndex('ArrowDown', 3, 2, options), 0);
  assert.equal(nextNavigationIndex('ArrowUp', 3, 0, options), 2);
  assert.equal(nextNavigationIndex('Home', 3, 1, options), 0);
  assert.equal(nextNavigationIndex('End', 3, 1, options), 2);
  assert.equal(nextNavigationIndex('ArrowDown', 3, -1, options), 0);
  assert.equal(nextNavigationIndex('ArrowUp', 3, -1, options), 2);
  assert.equal(nextNavigationIndex('ArrowRight', 3, 1, options), undefined);
  assert.equal(nextNavigationIndex('End', 0, -1, options), undefined);
});

test('horizontal navigation can stop at the edges', () => {
  const options = { axis: 'horizontal' } as const;
  assert.equal(nextNavigationIndex('ArrowRight', 3, 1, options), 2);
  assert.equal(nextNavigationIndex('ArrowRight', 3, 2, options), 2);
  assert.equal(nextNavigationIndex('ArrowLeft', 3, 0, options), 0);
  assert.equal(nextNavigationIndex('ArrowDown', 3, 1, options), undefined);
});

test('registered items follow DOM order and stay within their own visible, enabled scope', () => {
  const root = { contains: () => true } as unknown as HTMLElement;
  const nested = { contains: () => true } as unknown as HTMLElement;
  const boundary = '[data-navigation]';
  const candidate = (position: number, { owner = root, disabled = false, ariaDisabled = false, hidden = false } = {}) => ({
    position,
    DOCUMENT_POSITION_FOLLOWING: 4,
    compareDocumentPosition: (other: { position: number }) => position < other.position ? 4 : 2,
    matches: (selector: string) => selector === ':disabled' && disabled,
    closest: (selector: string) => selector === boundary ? owner : hidden ? owner : null,
    getClientRects: () => [1],
    getAttribute: (name: string) => name === 'aria-disabled' && ariaDisabled ? 'true' : null,
  } as unknown as HTMLElement);

  const first = candidate(1);
  const last = candidate(7);
  const locked = candidate(5, { ariaDisabled: true });
  const candidates = [last, candidate(2, { owner: nested }), locked, candidate(3, { disabled: true }),
    candidate(4, { hidden: true }), first];

  assert.deepEqual(navigationItems(root, { boundary, candidates }), [first, last]);
  assert.deepEqual(navigationItems(root, { boundary, candidates, includeAriaDisabled: true }), [first, locked, last]);
});
