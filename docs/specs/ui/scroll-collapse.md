# Scroll and collapse pilot

Flex `ui.scroll` decorates its existing DOM viewport with the same native
scrollbar/axis/fade infrastructure as ScrollArea. Layout fields map into Flex
RPX layout; explicit layout props win. Feed position is owned by
`ui.scroll.feed.use({scope, enabled, anchorId, itemAttribute, viewport, content})`.
This uses the migrated existing feed lifecycle (manual following, delayed DOM,
content resize and anchor release); paging and read receipts remain outside UI.
It does not yet implement prepend preservation across an independently loaded page.

`ui.collapse.use({defaultOpen})` uses existing useCollapseState and CollapseWrap
transition controls; `Flex ui={{collapse}}` supplies controlled options.
No second motion engine; current commands are intent-only, transition completion
is still available on the existing CollapseWrap ref contract.
