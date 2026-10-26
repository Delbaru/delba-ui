import assert from 'node:assert/strict';
import test from 'node:test';

import { acquireScrollLock } from './scroll-lock';

function inlineStyle() {
  const properties = new Map<string, { value: string; priority: string }>();
  return {
    getPropertyValue: (name: string) => properties.get(name)?.value ?? '',
    getPropertyPriority: (name: string) => properties.get(name)?.priority ?? '',
    setProperty: (name: string, value: string, priority = '') => properties.set(name, { value, priority }),
    removeProperty: (name: string) => properties.delete(name),
  };
}

function fixture(gutter = 16, stable = false) {
  const rootStyle = inlineStyle();
  const bodyStyle = inlineStyle();
  const document = {
    documentElement: {
      style: rootStyle,
      get clientWidth() { return rootStyle.getPropertyValue('overflow') === 'hidden' ? 1000 : 1000 - gutter; },
      getBoundingClientRect() {
        return { width: !stable && rootStyle.getPropertyValue('overflow') === 'hidden' ? 1000 : 1000 - gutter };
      },
    },
    body: { style: bodyStyle },
    defaultView: { getComputedStyle: () => ({ paddingRight: '12px' }) },
  } as unknown as Document;
  return { document, rootStyle, bodyStyle };
}

test('stable gutter keeps its layout width even when clientWidth reports the viewport', () => {
  const { document, bodyStyle } = fixture(16, true);
  const release = acquireScrollLock(document);
  assert.equal(document.documentElement.clientWidth, 1000);
  assert.equal(bodyStyle.getPropertyValue('padding-right'), '');
  release();
});

test('overlapping providers keep their document locked until the last lease ends', () => {
  const { document, rootStyle, bodyStyle } = fixture();
  const releaseFirst = acquireScrollLock(document);
  const releaseSecond = acquireScrollLock(document);

  assert.equal(rootStyle.getPropertyValue('overflow'), 'hidden');
  assert.equal(bodyStyle.getPropertyValue('padding-right'), 'calc(12px + 16px)');
  releaseFirst();
  releaseFirst();
  assert.equal(rootStyle.getPropertyValue('overflow'), 'hidden');
  releaseSecond();
  assert.equal(rootStyle.getPropertyValue('overflow'), '');
  assert.equal(bodyStyle.getPropertyValue('overflow'), '');
  assert.equal(bodyStyle.getPropertyValue('padding-right'), '');
});

test('unlock restores inline values and priorities, including overflow longhands', () => {
  const { document, rootStyle, bodyStyle } = fixture();
  rootStyle.setProperty('overflow-x', 'clip', 'important');
  rootStyle.setProperty('overflow-y', 'scroll');
  bodyStyle.setProperty('overflow', 'auto', 'important');
  bodyStyle.setProperty('padding-right', '2rem', 'important');

  const release = acquireScrollLock(document);
  release();

  assert.equal(rootStyle.getPropertyValue('overflow-x'), 'clip');
  assert.equal(rootStyle.getPropertyPriority('overflow-x'), 'important');
  assert.equal(rootStyle.getPropertyValue('overflow-y'), 'scroll');
  assert.equal(rootStyle.getPropertyPriority('overflow-y'), '');
  assert.equal(bodyStyle.getPropertyValue('overflow'), 'auto');
  assert.equal(bodyStyle.getPropertyPriority('overflow'), 'important');
  assert.equal(bodyStyle.getPropertyValue('padding-right'), '2rem');
  assert.equal(bodyStyle.getPropertyPriority('padding-right'), 'important');
});

test('a stable or absent gutter does not replace existing padding', () => {
  const { document, bodyStyle } = fixture(0);
  bodyStyle.setProperty('padding-right', '3rem');
  const release = acquireScrollLock(document);

  assert.equal(bodyStyle.getPropertyValue('padding-right'), '3rem');
  release();
  assert.equal(bodyStyle.getPropertyValue('padding-right'), '3rem');
});

test('documents have independent locks and can be locked again after cleanup', () => {
  const first = fixture();
  const second = fixture();
  const releaseFirst = acquireScrollLock(first.document);
  const releaseSecond = acquireScrollLock(second.document);
  releaseFirst();
  assert.equal(second.rootStyle.getPropertyValue('overflow'), 'hidden');

  const releaseAgain = acquireScrollLock(first.document);
  assert.equal(first.rootStyle.getPropertyValue('overflow'), 'hidden');
  releaseAgain();
  releaseSecond();
  assert.equal(first.rootStyle.getPropertyValue('overflow'), '');
  assert.equal(second.rootStyle.getPropertyValue('overflow'), '');
});
