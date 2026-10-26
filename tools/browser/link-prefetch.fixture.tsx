import { useState } from 'react';
import { useLinkPrefetch, type LinkPrefetchProps } from '../../src/hooks/useLinkPrefetch';

export function LinkPrefetchFixture() {
  const [href, setHref] = useState('/first');
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<LinkPrefetchProps['prefetch']>('intent');
  const prepare = useLinkPrefetch(mode, href, enabled);
  return <main>
    <a href={href} onMouseEnter={prepare.onIntent} onFocus={prepare.onIntent}>Target</a>
    <output data-testid="prepared">{String(prepare.prefetch)}</output>
    <button onClick={() => setHref('/second')}>Change address</button>
    <button onClick={() => setHref('#local')}>Anchor</button>
    <button onClick={() => setEnabled(!enabled)}>Disable</button>
    <button onClick={() => setMode(true)}>Automatic full</button>
    <button onClick={() => setMode(false)}>Off</button>
  </main>;
}
