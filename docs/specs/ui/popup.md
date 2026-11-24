# Popup pilot

Button `ui.popup` tooltip delegates to its existing Tooltip behavior. Flex `ui.popup` context/rightClick or menu/click delegates to Dropdown. Content receives `close()`; menu has focus restoration and context menu supports Shift+F10. ContextPopup also preserves dismiss on actual source scroll, resize and window blur. Product skins and boundaries are supplied by consumers. Hover-interactive menu, touch and nested popup acceptance remain open. No new positioning or portal engine.

Click menus ignore events originating in another portal or an interactive child.
Consumed popup events do not bubble to ancestor triggers. Removing/changing a
popup preset or closing a controlled Flex collapse clears the popup state;
a hidden surface must not revive its old menu on reopening. Keyboard ArrowDown
opens a click menu, Escape on the trigger closes it. Full touch/hover/nested
focus and browser acceptance remain outstanding.
