# Popup pilot

Button `ui.popup` tooltip delegates to its existing Tooltip behavior. Flex `ui.popup` context/rightClick or menu/click delegates to Dropdown. Content receives `close()`; menu has focus restoration and context menu supports Shift+F10. ContextPopup also preserves dismiss on actual source scroll, resize and window blur. Product skins and boundaries are supplied by consumers. Hover-interactive menu, touch and nested popup acceptance remain open. No new positioning or portal engine.
