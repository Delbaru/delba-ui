# Collection

`ui.collection.define<T>(name, key)` creates a definition, not data or selection state.
`ui.collection.use(definition, items, { scope, retainMissing })` is local.
Selection stores IDs; selected records resolve from the current items first.
Explicit retainMissing preserves only selected off-page references for consumers
such as message transfer; these are not authorized server data. Select all means
loaded keys. Scope change clears selection. Shift selects a range in current order,
Ctrl/Cmd and active selection toggle; Space and Shift+Space are keyboard equivalents.
Links, inputs and selected native text are not hijacked.
`Flex ui={{collection}}` provides the definition to descendants;
`ui.collection.item.use(definition, id)` finds the closest matching context.
`Flex ui={{selectable: item}}` composes pointer/keyboard handlers with caller events.
The owner must provide the appropriate semantic role and accessible name.
Existing consumer APIs may use the same controller's item handlers during migration.
Unit checks and browser/consumer acceptance remain separate.

The optional `mode: 'single'` replaces selection on click or select, toggles the
selected item off, and limits selectAll to the first loaded item. The default
remains multiple selection. Scope, definition or mode changes reset local
selection. With retainMissing disabled, disappearing IDs are forgotten rather
than silently selected again when they reappear. Portal events outside the item
DOM do not activate it. With retainMissing enabled, the owner must explicitly
unselect a confirmed deleted ID (absence may mean pagination).

Retained off-page previews remember the most recent committed loaded object. Reconstructed items do not cause a render-phase state update. Nested selectable surfaces do not toggle ancestors; interactive descendants retain their own behavior.

`ui.collection.define<T extends {id: string}>(name)` may omit the key
selector; the existing explicit selector overload remains. Flex collections
and selectable items carry a scoped DOM identity. Arrow keys/Home/End move
focus within that collection, Shift extends the range, Ctrl/Cmd+A selects
loaded items. Embedded controls keep their native keyboard behavior.
