import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveIconStructure } from '../Icon.model';

test('a plain glyph owns public interaction, motion, and tooltip targets', () => {
  const structure = resolveIconStructure({ hasFrame: false, hasLink: false, hasHover: false });

  assert.equal(structure.frame, null);
  assert.equal(structure.link, null);
  assert.deepEqual(structure.visual, {
    kind: 'glyph', interactive: true, receivesRootDomProps: true, receivesEvents: true,
  });
  assert.equal(structure.motionTarget, 'glyph');
  assert.equal(structure.tooltipTarget, 'glyph');
});

test('hover stack and optional root frame retain one owner per behavior', () => {
  const stacked = resolveIconStructure({ hasFrame: false, hasLink: false, hasHover: true });
  assert.equal(stacked.visual.kind, 'hover-stack');
  assert.equal(stacked.motionTarget, 'stack');
  assert.equal(stacked.tooltipTarget, 'stack');
  assert.equal(stacked.visual.interactive, true);

  const linkedFrame = resolveIconStructure({ hasFrame: true, hasLink: true, hasHover: true });
  assert.deepEqual(linkedFrame.frame, { render: true, interactive: false });
  assert.deepEqual(linkedFrame.link, { render: true });
  assert.equal(linkedFrame.motionTarget, 'frame');
  assert.equal(linkedFrame.tooltipTarget, 'link');
  assert.equal(linkedFrame.visual.interactive, false);
  assert.equal(linkedFrame.visual.receivesRootDomProps, false);
  assert.equal(linkedFrame.visual.receivesEvents, false);
});

test('a link owns focus semantics while the visual still receives pointer and click handlers', () => {
  const linkedGlyph = resolveIconStructure({ hasFrame: false, hasLink: true, hasHover: false });

  assert.deepEqual(linkedGlyph.link, { render: true });
  assert.equal(linkedGlyph.visual.interactive, false);
  assert.equal(linkedGlyph.visual.receivesEvents, true);
  assert.equal(linkedGlyph.tooltipTarget, 'link');
});
