import { useLayoutEffect, useRef, useState } from 'react';
import { Flex } from '../../src/components/Flex/Flex';
import { Button } from '../../src/components/Button/Button';
import { ui } from '../../src/ui';

type FeedItem = { id: string; text: string };

export function FeedScrollFixture() {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<FeedItem[]>(() =>
    Array.from({ length: 40 }, (_, index) => ({ id: `item-${index + 1}`, text: `Message ${index + 1}` })),
  );
  const [restore, setRestore] = useState<(() => boolean) | null>(null);
  const historyRestore = useRef<(() => boolean) | null>(null);
  const [historyResult, setHistoryResult] = useState('none');
  const [height, setHeight] = useState(200);
  const [removeId, setRemoveId] = useState('');
  const feed = ui.scroll.feed.use({
    scope: 'feed-scroll-fixture',
    enabled: true,
    itemAttribute: 'data-feed-item',
    viewport,
    content,
  });
  useLayoutEffect(() => {
    if (!restore) return;
    restore();
    setRestore(null);
  }, [items, restore]);
  const prepend = () => {
    const restoreAnchor = feed.captureHistoryAnchor();
    setRestore(() => restoreAnchor);
    setItems(current => [{ id: 'older', text: 'Older message' }, ...current]);
  };
  return (
    <main>
      <h1>Feed scroll lifecycle</h1>
      <Flex
        ref={viewport}
        data-testid="feed-viewport"
        role="log"
        aria-label="Feed messages"
        tabIndex={0}
        dir="column"
        style={{ height }}
        ui={{ scroll: { preset: 'feed', axis: 'y', fade: true, height: 200 } }}
      >
        <Flex ref={content} dir="column" gap={[0, 0, 0]}>
          {items.map(item => (
            <div key={item.id} data-feed-item={item.id} data-testid={`feed-${item.id}`}
              style={{ flexShrink: 0, height: 32 }}>
              {item.text}
            </div>
          ))}
        </Flex>
      </Flex>
      <output data-testid="feed-show-bottom">{String(feed.showBottom)}</output>
      <Button onClick={() => setItems(current => [...current, { id: `new-${current.length}`, text: 'New message' }])}>Append message</Button>
      <Button onClick={prepend}>Prepend with anchor</Button>
      <input aria-label="Remove feed item" value={removeId} onChange={event => setRemoveId(event.currentTarget.value)} />
      <Button onClick={() => {
        const restoreAnchor = feed.captureHistoryAnchor();
        setRestore(() => restoreAnchor);
        setItems(current => [
          { id: 'older-replacement-one', text: 'Older replacement one' },
          { id: 'older-replacement-two', text: 'Older replacement two' },
          ...current.filter(item => item.id !== removeId),
        ]);
      }}>Replace removed feed anchor</Button>
      <Button onClick={() => setHeight(value => value === 200 ? 280 : 200)}>Resize feed viewport</Button>
      <Button onClick={feed.latest}>Follow latest</Button>
      <Button onClick={() => {
        historyRestore.current = feed.captureHistoryAnchor();
        setHistoryResult(historyRestore.current ? 'captured' : 'unavailable');
      }}>Capture history anchor</Button>
      <Button onClick={() => {
        const restored = historyRestore.current?.() ?? false;
        historyRestore.current = null;
        setHistoryResult(String(restored));
      }}>Restore captured anchor</Button>
      <output data-testid="feed-history-result">{historyResult}</output>
    </main>
  );
}
