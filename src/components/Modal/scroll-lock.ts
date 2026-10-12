type InlineProperty = { value: string; priority: string };
type ScrollLock = { count: number; restore: () => void };

const locks = new WeakMap<Document, ScrollLock>();
const overflowProperties = ['overflow', 'overflow-x', 'overflow-y'];

function saveProperty(style: CSSStyleDeclaration, name: string): InlineProperty {
  return { value: style.getPropertyValue(name), priority: style.getPropertyPriority(name) };
}

function restoreProperty(style: CSSStyleDeclaration, name: string, saved: InlineProperty) {
  if (saved.value) style.setProperty(name, saved.value, saved.priority);
  else style.removeProperty(name);
}

function hideOverflow(style: CSSStyleDeclaration): () => void {
  const saved = overflowProperties.map((name) => ({ name, ...saveProperty(style, name) }));
  style.setProperty('overflow', 'hidden', 'important');

  return () => {
    // A shorthand replaces both longhands, whose original priorities may differ.
    for (const name of overflowProperties) style.removeProperty(name);
    for (const property of saved) restoreProperty(style, property.name, property);
  };
}

/** Keep one document locked until every modal provider releases its lease. */
export function acquireScrollLock(document: Document): () => void {
  let lock = locks.get(document);
  if (!lock) {
    const view = document.defaultView;
    const root = document.documentElement;
    const body = document.body;
    if (!view || !body) return () => {};

    const originalWidth = root.clientWidth;
    const padding = saveProperty(body.style, 'padding-right');
    const computedPadding = view.getComputedStyle(body).paddingRight;
    const restoreRoot = hideOverflow(root.style);
    const restoreBody = hideOverflow(body.style);
    // Measure the width actually reclaimed: stable scrollbar gutters need no compensation.
    const compensation = Math.max(0, root.clientWidth - originalWidth);
    if (compensation) body.style.setProperty('padding-right', `calc(${computedPadding} + ${compensation}px)`, 'important');

    lock = {
      count: 0,
      restore: () => {
        restoreRoot();
        restoreBody();
        if (compensation) restoreProperty(body.style, 'padding-right', padding);
      },
    };
    locks.set(document, lock);
  }

  lock.count += 1;
  const lease = lock;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lease.count -= 1;
    if (lease.count) return;
    lease.restore();
    locks.delete(document);
  };
}
