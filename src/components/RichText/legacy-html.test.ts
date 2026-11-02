import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLegacyRichText, flattenLegacyBlocks } from './legacy-html';

test('legacy rich text preserves nested lists and following blocks', () => {
  const blocks = parseLegacyRichText(
    '<ul><li>Parent<ul><li>Nested child</li></ul></li><li>Sibling</li></ul><p>After<br>line</p>',
  );

  assert.deepEqual(blocks, [
    {
      type: 'list',
      tag: 'ul',
      items: ['Parent<ul><li>Nested child</li></ul>', 'Sibling'],
    },
    { type: 'paragraph', parts: ['After', 'line'] },
  ]);
  assert.equal(
    flattenLegacyBlocks(blocks),
    'Parent<ul><li>Nested child</li></ul> Sibling After line',
  );
});

test('legacy list parsing balances mixed nested list tags without splitting child items', () => {
  const blocks = parseLegacyRichText(
    '<ol><li>First<ul><li>Unordered child</li></ul></li><li>Second</li></ol><h2>End</h2>',
  );

  assert.deepEqual(blocks, [
    {
      type: 'list',
      tag: 'ol',
      items: ['First<ul><li>Unordered child</li></ul>', 'Second'],
    },
    { type: 'heading', level: 2, content: 'End' },
  ]);
});

test('plain legacy links unwrap safe anchors while preserving inline formatting', () => {
  const blocks = parseLegacyRichText(
    '<p><strong>Bold</strong> <a href="https://example.com"><em>linked</em></a></p>',
    'text',
  );

  assert.deepEqual(blocks, [
    { type: 'paragraph', parts: ['<strong>Bold</strong> <em>linked</em>'] },
  ]);
  assert.equal(
    blocks[0]?.type === 'paragraph' ? blocks[0].parts.join('').includes('<a') : true,
    false,
  );
});
