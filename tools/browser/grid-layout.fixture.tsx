import { useState } from 'react';
import { Grid, GridItem } from '../../src/components/Grid';
import '../../src/components/Grid/_grid.scss';

export function GridLayoutFixture() {
  const [ids, setIds] = useState(['a', 'b', 'c']);
  const [columns, setColumns] = useState<3 | 4>(3);
  const [mounted, setMounted] = useState(true);
  const [instant, setInstant] = useState(false);
  return <main>
    <button onClick={() => setIds(['a', 'b', 'c', 'd', 'e'])}>Add</button>
    <button onClick={() => setIds(['a', 'c'])}>Remove</button>
    <button onClick={() => setIds(['c', 'b', 'a'])}>Reverse</button>
    <button onClick={() => setIds([])}>Empty</button>
    <button onClick={() => setIds(['a', 'b', 'c'])}>Reset</button>
    <button onClick={() => setColumns(columns === 3 ? 4 : 3)}>Columns</button>
    <button onClick={() => setMounted(!mounted)}>Mount</button>
    <button onClick={() => setInstant(!instant)}>Instant</button>
    {mounted && <Grid data-testid="layout-grid" columns={columns === 3 ? [3, 3, 3] : [4, 4, 4]} gap={[16, 16, 16]}
      style={{ width: 900 }} animate={{ when: 'change', effect: 'layout', duration: instant ? 0 : 0.5, stagger: 0.1 }}>
      {ids.map((id) => <GridItem key={id} data-testid={`item-${id}`} style={{ height: 120, background: '#eee' }}>
        <label>{id}<input aria-label={`Value ${id}`} defaultValue={id} /></label>
      </GridItem>)}
    </Grid>}
  </main>;
}
