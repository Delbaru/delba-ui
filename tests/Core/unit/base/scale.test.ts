import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageSizes } from '../../../../src/core/base/scale';
import { responsiveScaleCss } from '../../../../src/core/base/responsive-definition';
import { starterFrontend } from '../../../../tools/visual/starter';

const responsive = starterFrontend.responsive;
test('image sizes derive fluid bases and caps from the full responsive definition', () => {
  assert.equal(imageSizes({desktop:624,mobile:280,tablet:704}, responsive),
    '(max-width: 767px) 87.5vw, (max-width: 1023px) 91.67vw, (min-width: 2560px) 832px, 32.5vw');
  assert.equal(imageSizes({desktop:'50%',mobile:'100%',tablet:384}, responsive),
    '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 50vw');
});
test('fixed scale preserves authored RPX as physical pixels', () => {
  const fixed = {mobile:{...responsive.mobile,scale:'fixed'},tablet:{...responsive.tablet,scale:'fixed'},desktop:{...responsive.desktop,scale:'fixed'}} as const;
  assert.equal(imageSizes({desktop:624,mobile:280,tablet:704}, fixed),
    '(max-width: 767px) 280px, (max-width: 1023px) 704px, 624px');
  assert.equal((responsiveScaleCss(fixed).match(/--rpx: 1px/g) ?? []).length, 3);
});
test('non-percent CSS image widths remain unsupported', () => {
  assert.throws(() => imageSizes({desktop:'10rem',mobile:4,tablet:4}, responsive), /number/);
});
