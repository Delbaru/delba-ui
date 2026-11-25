import { useState } from 'react';
import { ui } from '../../src/ui';
import { Flex } from '../../src/components/Flex/Flex';
import { Button } from '../../src/components/Button/Button';

type Item = { id: string; label: string };
const definition = ui.collection.define<Item>('collection-browser-fixture');

function CollectionRow({ item, onNestedAction }: { item: Item; onNestedAction: () => void }) {
  const selectable = ui.collection.item.use(definition, item.id);
  if (!selectable) return null;
  return (
    <Flex ui={{ selectable }} role="option" tabIndex={0}
      aria-label={item.label} data-testid={`item-${item.id}`}>
      <span>{item.label}</span>
      {item.id === 'a' && <Button onClick={onNestedAction}>Nested action</Button>}
    </Flex>
  );
}

export function CollectionFixture() {
  const [items, setItems] = useState<Item[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ]);
  const [scope, setScope] = useState('owner-a');
  const [nestedActions, setNestedActions] = useState(0);
  const collection = ui.collection.use(definition, items, { scope, retainMissing: true });
  const removeAlpha = () => setItems(current => current.filter(item => item.id !== 'a'));
  const refreshAlpha = () => setItems(current => [
    { id: 'a', label: 'Alpha refreshed' },
    ...current.filter(item => item.id !== 'a'),
  ]);
  return (
    <main>
      <h1>Collection browser contract</h1>
      <Flex ui={{ collection }} role="listbox" aria-label="Messages" aria-multiselectable="true"
        data-testid="collection-root" dir={['column', 'column', 'column']}>
        {items.map(item => (
          <CollectionRow key={item.id} item={item} onNestedAction={() => setNestedActions(value => value + 1)} />
        ))}
      </Flex>
      <output data-testid="collection-selected">{collection.selected.map(item => item.label).join('|')}</output>
      <output data-testid="collection-count">{collection.count}</output>
      <output data-testid="collection-nested-actions">{nestedActions}</output>
      <Button onClick={collection.clear}>Clear selection</Button>
      <Button onClick={() => setScope(value => value === 'owner-a' ? 'owner-b' : 'owner-a')}>Switch owner</Button>
      <Button onClick={removeAlpha}>Remove Alpha</Button>
      <Button onClick={refreshAlpha}>Refresh Alpha</Button>
      <Button onClick={() => collection.unselect('a')}>Forget Alpha</Button>
    </main>
  );
}
