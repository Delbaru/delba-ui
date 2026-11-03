import assert from 'node:assert/strict';
import test from 'node:test';
import { splitRootDomProps } from '../root-dom-props';

test('only known root conventions move; scrollbar remains separate from retired responsive hide', () => {
  const props = {
    'data-hide-scrollbar': true,
    'data-hide-mobile': true,
    'data-hide-tablet': true,
    'data-hide-pc': true,
    'data-hide-desktop': true,
    'data-hide-unknown': true,
    'data-order-mobile': 2,
    'data-fancybox-group': 'photos',
    'data-carousel-slide': 1,
    title: 'Image',
  };
  const { rootProps, elementProps } = splitRootDomProps(props);
  assert.deepEqual(rootProps, {
    'data-hide-scrollbar': true,
    'data-order-mobile': 2,
    'data-fancybox-group': 'photos',
    'data-carousel-slide': 1,
  });
  assert.equal(elementProps['data-hide-mobile'], true);
  assert.equal(elementProps['data-hide-unknown'], true);
  assert.equal(elementProps.title, 'Image');
  assert.equal(props['data-hide-scrollbar'], true, 'splitting preserves the caller object');
});
