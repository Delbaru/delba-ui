import { createContext, useContext, useState } from 'react';
import { Modal } from '../../src/components/Modal/Modal';

const LocalContext = createContext('missing declaration context');

function ContextValue({ name }: { name: string }) {
  return <output data-testid={name}>{useContext(LocalContext)}</output>;
}

/** The context deliberately sits below the global ModalProvider in main.tsx. */
export function ModalContextFixture() {
  const [value, setValue] = useState('alpha');
  return <section aria-label="Modal declaration context" className="fixture">
    <LocalContext.Provider value={value}>
      <Modal aria-label="Context outer dialog" style={{ width: 360 }}
        trigger={<button type="button">Open context dialog</button>}>
        <ContextValue name="outer-dialog-context" />
        <button type="button" onClick={() => setValue('beta')}>Update declaration context</button>
        <LocalContext.Provider value={`nested:${value}`}>
          <Modal aria-label="Context nested dialog" style={{ width: 320 }}
            trigger={<button type="button">Open nested context dialog</button>}>
            <ContextValue name="nested-dialog-context" />
            <button type="button" onClick={() => setValue('gamma')}>Update nested declaration context</button>
          </Modal>
        </LocalContext.Provider>
      </Modal>
    </LocalContext.Provider>
  </section>;
}
