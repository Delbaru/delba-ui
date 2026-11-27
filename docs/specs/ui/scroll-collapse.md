# Scroll and collapse pilot

Flex `ui.scroll` decorates its existing DOM viewport with the same native
scrollbar/axis/fade infrastructure as ScrollArea. Layout fields map into Flex
RPX layout; explicit layout props win. Feed position is owned by
`ui.scroll.feed.use({scope, enabled, anchorId, itemAttribute, viewport, content})`.
This uses the migrated existing feed lifecycle (manual following, delayed DOM,
content resize and anchor release); paging and read receipts remain outside UI.
For an independently loaded page, capture immediately before prepending:
`const restore = feed.captureHistoryAnchor()`. Call `restore?.()` once after the
new DOM commits (e.g. in a layout effect). It returns false when a reader gesture,
a newer capture, scope change, or unmount invalidates the capture. If the first
visible item was deleted, restoration uses the next surviving measured item,
then a preceding item; it returns false if no captured item survives.
Following the end and explicit deep-link anchors take precedence. Stable unique
item IDs are required. The correction uses measured relative geometry, so native
scroll anchoring is not applied twice. Chat must wire this at its actual prepend
commit; dynamic changes after restoration and browser behavior need integration QA.

`ui.collapse.use({defaultOpen})` uses existing useCollapseState and CollapseWrap
transition controls; `Flex ui={{collapse}}` supplies controlled options.
No second motion engine; current commands are intent-only, transition completion
is still available on the existing CollapseWrap ref contract.

Both `height` and `width` accept an RPX numeric value or `{ min, max }` (either bound optional). `p` accepts top/right/bottom/left RPX padding on the same viewport; explicit Flex layout wins.

Collapse accepts the existing animation options (axis, gap, gapSide, fade,
keepMounted, appear, overflowVisibleWhenOpen, onFound/onEnd/onTransition).
Internal `CollapseWrap.className` applies to its existing motion root; it does
not create another element. Frame owners combine their own module class with
the supplied class. This internal detail does not add a root package export.
`collapse.trigger` is a convenience for a button's aria-expanded/onClick;
`collapse.controls` exposes the original mounted CollapseControls ref. An
explicit feed anchor centers only its own viewport, not an ancestor page.


The `ui.collapse.use` public door now has a browser consumer fixture exercising its shared trigger, controlled state and imperative show/hide commands. Source coverage is in `tests/Collapse/e2e/Collapse.spec.ts`; execution remains unverified.


Feed follow and history-anchor browser coverage is authored in `tests/Scroll/e2e/FeedScroll.spec.ts` against the real `ui.scroll.feed.use` hook and Flex scroll surface. The fixture exercises bottom-follow, reader-gesture release, append without forced scroll, latest, and prepend anchor restoration. Browser execution remains unverified.

## RPX и feed surface

- `height`, `width` и стороны `p` принимают RPX `ResponsiveValue`; `height`/`width` также принимают `{ min, max }`, где каждая граница может быть responsive.
- `preset: 'feed'` маркирует viewport атрибутом `data-scroll-preset="feed"`, но не подменяет владельца feed-состояния: history/following по-прежнему подключаются через `ui.scroll.feed.use`.
- `CollapseOptions.gap` остаётся responsive RPX. `ScrollbarOptions` и `ScrollOptions` доступны через публичный вход.

