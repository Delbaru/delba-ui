import assert from 'node:assert/strict';
import test from 'node:test';

import { createSmoothScroll, SMOOTH_SCROLL_IGNORE } from '../../../src/core/Scroll/Smooth/engine';
import { createSmoothViewport } from '../../../src/core/Scroll/Smooth/viewport';
import type { SmoothScrollConfig } from '../../../src/core/Scroll/Smooth/types';

const config: SmoothScrollConfig = {
  lerp: 0.5, wheelMultiplier: 1, duration: 0.2, easing: value => value,
  offset: 16, mobile: true, anchors: true, updateHash: true,
};

class Box extends EventTarget {
  scrollTop = 0;
  scrollHeight = 900;
  clientHeight = 200;
  clientTop = 4;
  top = 100;
  height = 200;
  overflowY = 'auto';
  overscrollBehaviorY = 'auto';
  scrollMarginTop = '0px';
  scrollMarginBottom = '0px';
  tabIndex = -1;
  focused = false;
  isConnected = true;
  parent?: Box;
  attributes = new Map<string, string>();
  children = new Map<string, Box>();
  writes: { top: number; behavior?: ScrollBehavior }[] = [];
  constructor(readonly ownerDocument: Document) { super(); }
  getBoundingClientRect() {
    const top = this.top - (this.parent?.scrollTop ?? 0);
    return { top, bottom: top + this.height };
  }
  hasAttribute(attribute: string) { return this.attributes.has(attribute); }
  setAttribute(attribute: string, value: string) { this.attributes.set(attribute, value); }
  querySelector(selector: string) { return this.children.get(selector) ?? null; }
  contains(node: Box) { return node === this || node.parent === this; }
  scrollTo({ top = 0, behavior }: ScrollToOptions) {
    this.writes.push({ top, behavior });
    if (behavior === 'smooth') return;
    this.scrollTop = top;
    this.dispatchEvent(new Event('scroll'));
  }
  focus() { this.focused = true; }
}

class Link extends Box {
  target = '';
  href = 'https://example.test/#entry';
  constructor(document: Document) {
    super(document);
    this.setAttribute('href', '#entry');
  }
}

function setup() {
  let clock = 0;
  let frameId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const observers = new Set<ResizeObserver>();
  const hashes: string[] = [];
  const location = { href: 'https://example.test/', hash: '' };
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const otherQuery = Object.assign(new EventTarget(), { matches: false });
  const documentEvents = new EventTarget();
  const viewEvents = new EventTarget();
  const view = Object.assign(viewEvents, {
    Element: Box,
    HTMLElement: Box,
    HTMLAnchorElement: Link,
    scrollY: 0,
    innerHeight: 500,
    CSS: { escape: (value: string) => value },
    location,
    history: { pushState(_state: unknown, _title: string, href: string) { hashes.push(href); } },
    performance: { now: () => clock, getEntriesByType: () => [] },
    ResizeObserver: class {
      constructor() { observers.add(this); }
      observe() {}
      unobserve() {}
      disconnect() { observers.delete(this); }
    },
    getComputedStyle: (element: Box) => element,
    matchMedia: (query: string) => query.includes('prefers-reduced-motion') ? reduced : otherQuery,
    requestAnimationFrame(callback: FrameRequestCallback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    scrollTo({ top = 0 }: ScrollToOptions) {
      this.scrollY = top;
      viewEvents.dispatchEvent(new Event('scroll'));
    },
  });
  const document = Object.assign(documentEvents, {
    defaultView: view,
    body: { overflowY: 'visible' },
    documentElement: { overflowY: 'visible', scrollHeight: 4000 },
    readyState: 'complete',
    getElementById: (_id: string): Box | null => null,
    querySelectorAll: () => [],
  }) as unknown as Document;

  const surface = (host?: Box) => {
    const viewport = createSmoothViewport(document, host as unknown as HTMLElement | undefined);
    assert.ok(viewport);
    return viewport;
  };
  const advance = () => {
    clock += 16;
    for (const [id, callback] of [...frames]) {
      if (frames.delete(id)) callback(clock);
    }
  };
  const settle = () => {
    for (let remaining = 300; frames.size && remaining > 0; remaining--) advance();
    assert.equal(frames.size, 0, 'the idle surface should have no pending frame');
  };
  return { view, document, surface, advance, settle, frames, observers, reduced, hashes };
}

function wheel(path: EventTarget[], deltaY: number, cancelable = true) {
  const event = Object.assign(new Event('wheel', { cancelable }), {
    composedPath: () => path, deltaX: 0, deltaY, deltaMode: 0,
  });
  for (const target of path) target.dispatchEvent(event);
  return event;
}

test('nested self engines consume a wheel sample once and let native descendants scroll', () => {
  const { view, document, surface, settle } = setup();
  const outer = new Box(document);
  const inner = new Box(document);
  const native = new Box(document);
  const windowEngine = createSmoothScroll(surface(), config);
  const outerEngine = createSmoothScroll(surface(outer), config);
  const innerEngine = createSmoothScroll(surface(inner), config);
  try {
    assert.equal(wheel([native, inner, outer, view], 80).defaultPrevented, false);
    assert.equal(wheel([inner, outer, view], 80, false).defaultPrevented, false);
    native.scrollTop = 700;
    native.overscrollBehaviorY = 'contain';
    assert.equal(wheel([native, inner, outer, view], 80).defaultPrevented, false);
    outer.setAttribute(SMOOTH_SCROLL_IGNORE, '');
    assert.equal(wheel([inner, outer, view], 80).defaultPrevented, false);
    outer.attributes.delete(SMOOTH_SCROLL_IGNORE);

    assert.equal(wheel([inner, outer, view], 80).defaultPrevented, true);
    settle();
    assert.equal(inner.scrollTop, 80);
    assert.equal(outer.scrollTop, 0);
    assert.equal(view.scrollY, 0);

    inner.scrollTop = 700;
    assert.equal(wheel([inner, outer, view], 120).defaultPrevented, true);
    settle();
    assert.equal(inner.scrollTop, 700);
    assert.equal(outer.scrollTop, 120);
    assert.equal(view.scrollY, 0);
  } finally {
    innerEngine.destroy();
    outerEngine.destroy();
    windowEngine.destroy();
  }
});

test('self commands use the bordered viewport and local anchors, and cancel before overwriting manual scroll', () => {
  const { view, document, surface, advance, settle, reduced, hashes } = setup();
  const host = new Box(document);
  const entry = new Box(document);
  entry.parent = host;
  entry.top = 600;
  entry.height = 50;
  entry.scrollMarginTop = '30px';
  const outside = new Box(document);
  host.children.set('#entry', entry);
  const link = new Link(document);
  const windowEngine = createSmoothScroll(surface(), config);
  const engine = createSmoothScroll(surface(host), config);
  try {
    engine.scrollTo('#entry', { immediate: true });
    assert.equal(host.scrollTop, 466);
    assert.equal(view.scrollY, 0);
    engine.scrollTo(outside as unknown as Element, { immediate: true });
    assert.equal(host.scrollTop, 466);

    engine.scrollTo(0);
    advance();
    host.scrollTop = 190;
    advance();
    assert.equal(host.scrollTop, 190, 'the engine yields even if the native scroll event has not fired yet');
    assert.equal(engine.isMoving(), false);

    engine.scrollTo(2000);
    host.scrollHeight = 1100; // Scroll height changed without a ResizeObserver callback on the fixed host.
    settle();
    assert.equal(host.scrollTop, 900);

    reduced.matches = true;
    reduced.dispatchEvent(new Event('change'));
    const click = Object.assign(new Event('click', { cancelable: true }), {
      composedPath: () => [link, host, view], button: 0, detail: 0,
    });
    view.dispatchEvent(click);
    assert.equal(click.defaultPrevented, false);
    host.dispatchEvent(click);
    assert.equal(click.defaultPrevented, true);
    assert.deepEqual(hashes, ['https://example.test/#entry']);
    assert.equal(host.scrollTop, 466);
    assert.equal(view.scrollY, 0);
    assert.equal(entry.focused, true);
  } finally {
    engine.destroy();
    windowEngine.destroy();
  }
});

test('window ownership is exclusive per realm and teardown releases listeners, observers and frames', () => {
  const first = setup();
  const second = setup();
  const firstEngine = createSmoothScroll(first.surface(), config);
  const secondEngine = createSmoothScroll(second.surface(), config);
  try {
    assert.throws(() => createSmoothScroll(first.surface(), config), /only one flex.*window/i);
    assert.equal(first.observers.size, 1);
    assert.equal(wheel([first.view], 100).defaultPrevented, true);
    assert.equal(first.frames.size, 1);
    firstEngine.destroy();
    assert.equal(first.frames.size, 0);
    assert.equal(first.observers.size, 0);
    assert.equal(wheel([first.view], 100).defaultPrevented, false);
    assert.equal(wheel([second.view], 100).defaultPrevented, true);

    const replacement = createSmoothScroll(first.surface(), config);
    try {
      firstEngine.destroy();
      assert.equal(wheel([first.view], 100).defaultPrevented, true);
    } finally {
      replacement.destroy();
    }
  } finally {
    firstEngine.destroy();
    secondEngine.destroy();
  }
});

test('scroll subscribers can supersede or destroy a flight without leaving an orphaned frame', () => {
  const { document, surface, advance, settle, frames } = setup();
  const host = new Box(document);
  const viewport = surface(host);
  const engine = createSmoothScroll(viewport, config);
  let replace = true;
  const release = viewport.events.subscribe(() => {
    if (!replace) return;
    replace = false;
    engine.scrollTo(600);
  });
  try {
    engine.scrollTo(400);
    host.dispatchEvent(new Event('scroll'));
    advance();
    assert.equal(host.scrollTop, 0);
    assert.equal(frames.size, 1, 'the subscription scheduled exactly one replacement frame');
    settle();
    assert.equal(host.scrollTop, 600);

    const releaseDestroy = viewport.events.subscribe(() => engine.destroy());
    engine.scrollTo(0);
    host.dispatchEvent(new Event('scroll'));
    advance();
    releaseDestroy();
    assert.equal(frames.size, 0);
    assert.equal(host.scrollTop, 600);
  } finally {
    release();
    engine.destroy();
  }
});

test('compact native scrolling stays interactive and reduced motion is immediate', () => {
  const { document, surface, reduced } = setup();
  const host = new Box(document);
  const engine = createSmoothScroll(surface(host), { ...config, mobile: false });
  try {
    assert.equal(wheel([host], 160).defaultPrevented, false);
    engine.scrollTo(300);
    assert.deepEqual(host.writes.pop(), { top: 300, behavior: 'smooth' });
    assert.equal(engine.isMoving(), undefined);
    engine.configure({ ...config, mobile: false, wheelMultiplier: 2 });
    assert.equal(engine.isMoving(), undefined);
    host.dispatchEvent(Object.assign(new Event('keydown'), { key: 'PageDown' }));
    assert.deepEqual(host.writes.pop(), { top: 0, behavior: 'instant' });
    assert.equal(engine.isMoving(), false);

    reduced.matches = true;
    reduced.dispatchEvent(new Event('change'));
    engine.scrollTo(300);
    assert.deepEqual(host.writes.pop(), { top: 300, behavior: 'instant' });
    assert.equal(wheel([host], 40).defaultPrevented, false);
  } finally {
    engine.destroy();
  }
});
