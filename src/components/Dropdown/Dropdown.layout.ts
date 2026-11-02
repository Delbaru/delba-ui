interface DropdownNodes {
  root: HTMLElement | null;
  anchor: HTMLElement | null;
  panel: HTMLElement | null;
  probe: HTMLElement | null;
  scope: HTMLElement | null;
}

/** Bridges inline CSS positioning and inherited theme variables to the shared floating engine. */
export const dropdownLayout = {
  sync(nodes: DropdownNodes, offset: number, variables: readonly `--${string}`[]) {
    const { root, anchor, panel, probe, scope } = nodes;
    const owner = (root ?? anchor)?.ownerDocument.defaultView;
    if (!owner) return 0;

    const gap = Math.sign(offset) * (probe?.getBoundingClientRect().width ?? 0);

    if (anchor && panel) {
      const bounds = anchor.getBoundingClientRect();
      const container = panel.offsetParent;
      const parent = container instanceof owner.HTMLElement ? container : null;
      const origin = parent?.getBoundingClientRect();
      const left =
        bounds.left - (origin?.left ?? 0) - (parent?.clientLeft ?? 0) + (parent?.scrollLeft ?? 0);
      const bottom =
        bounds.bottom - (origin?.top ?? 0) - (parent?.clientTop ?? 0) + (parent?.scrollTop ?? 0);
      const coordinates = {
        start: left,
        center: left + bounds.width / 2,
        end: left + bounds.width,
        bottom,
        width: bounds.width,
      };
      for (const [name, value] of Object.entries(coordinates))
        panel.style.setProperty(`--dropdown-anchor-${name}`, `${value}px`);
    }

    const theme = root ?? anchor;
    if (theme && scope) {
      const computed = owner.getComputedStyle(theme);
      for (const variable of variables) {
        const value = computed.getPropertyValue(variable).trim();
        if (value) scope.style.setProperty(variable, value);
        else scope.style.removeProperty(variable);
      }
    }
    return gap;
  },
};
