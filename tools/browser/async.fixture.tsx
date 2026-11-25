import { useState } from 'react';
import { Flex } from '../../src/components/Flex/Flex';
import { Button } from '../../src/components/Button/Button';
import { Text } from '../../src/components/Text/Text';

type Data = { value: string };
type Source = {
  data?: Data | Data[];
  isLoading?: boolean;
  isFetching?: boolean;
  empty?: boolean;
  error?: { status: number; message: string };
  refetch?: () => void;
};

export function AsyncFixture() {
  const [source, setSource] = useState<Source>({ isLoading: true });
  const [retries, setRetries] = useState(0);
  const retry = () => setRetries(value => value + 1);
  return (
    <main>
      <h1>Async source contract</h1>
      <Flex
        data-testid="async-surface"
        ui={{ async: {
          preset: 'default',
          from: { ...source, refetch: retry },
          loading: <div data-testid="async-loading">Loading source</div>,
          empty: <div data-testid="async-empty">No results</div>,
          error: (error, refetch) => (
            <div role="alert">
              <span>{(error as { message?: string }).message}</span>
              <Button onClick={() => refetch?.()}>Retry source</Button>
            </div>
          ),
          timing: { delay: 0, hide: 0 },
        } }}
      >
        <Text data-testid="async-value">{Array.isArray(source.data) ? source.data.length : source.data?.value}</Text>
      </Flex>
      <output data-testid="async-retries">{retries}</output>
      <Button onClick={() => setSource({ data: { value: 'current' } })}>Resolve source</Button>
      <Button onClick={() => setSource({ data: { value: 'current' }, error: { status: 0, message: 'Offline' } })}>Network error</Button>
      <Button onClick={() => setSource({ data: { value: 'stale' }, error: { status: 500, message: 'Server error' } })}>Server error</Button>
      <Button onClick={() => setSource({ data: [], empty: true })}>Empty source</Button>
    </main>
  );
}
