# Popup pilot

Button `ui.popup` tooltip delegates to its existing Tooltip behavior. Flex `ui.popup` context/rightClick or menu/click delegates to Dropdown. Content receives `close()`; menu has focus restoration and context menu supports Shift+F10. ContextPopup also preserves dismiss on actual source scroll, resize and window blur. Product skins and boundaries are supplied by consumers. Hover-interactive menu, touch and nested popup acceptance remain open. No new positioning or portal engine.

Click menus ignore events originating in another portal or an interactive child.
Consumed popup events do not bubble to ancestor triggers. Removing/changing a
popup preset or closing a controlled Flex collapse clears the popup state;
a hidden surface must not revive its old menu on reopening. Keyboard ArrowDown
opens a click menu, Escape on the trigger closes it. Full touch/hover/nested
focus and browser acceptance remain outstanding.

Flex accepts tooltip/menu/context. Button accepts menu/context as well as its existing styled tooltip. `menu.on` supports `click` or `hover`; hover uses the same Dropdown with a short leave grace period, keyboard/tap fallback, no automatic pointer focus steal. `position: 'bottom' | 'bottom-start' | 'bottom-end'` aligns the menu; native anchor navigation and submit/reset are not intercepted unless `consume: true` is explicit. Context triggers ignore nested controls. Touch context menu, nested portal traversal and browser focus verification remain gates.

Menu positions accept top/bottom/left/right, with optional -start/-end alignment.
Hover defaults to top, click to bottom-start. The existing portal geometry
engine may flip at the viewport boundary. Native touch pointer outside dismissal
and Dropdown logical ancestry are shared with other portalled surfaces.
