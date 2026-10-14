import { useState } from 'react';

import { Button } from '../../src/components/Button';
import { Dropdown } from '../../src/components/Dropdown';
import { Flex } from '../../src/components/Flex';
import { Modal, ModalProvider } from '../../src/components/Modal';

export function InteractionScopeFixture() {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(true);
  return (
    <section>
      <h2>Interaction scope</h2>
      <Button>Outside interaction scope</Button>
      <Button onClick={() => setMounted((current) => !current)}>
        Toggle scoped controls
      </Button>
      <ModalProvider>
        <Flex
          trackInteraction
          state={['compact', 'hide']}
          onInteractionChange={setActive}
          dir={['column', 'column', 'column']}
          data-testid="interaction-scope-root"
        >
          <output data-testid="interaction-scope-state">
            {String(active)}
          </output>
          {mounted && (
            <Flex trackInteraction>
              <Dropdown
                panel={{ portal: true }}
                trigger={<Button>Open scoped dropdown</Button>}
              >
                {(close) => (
                  <Button onClick={close}>Close scoped dropdown</Button>
                )}
              </Dropdown>
              <Modal
                aria-label="Scoped modal"
                trigger={<Button>Open scoped modal</Button>}
              >
                <p>Portal owned by the outer provider</p>
              </Modal>
            </Flex>
          )}
        </Flex>
      </ModalProvider>
    </section>
  );
}
