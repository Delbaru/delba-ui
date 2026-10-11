import { hydrateRoot } from 'react-dom/client';

import 'virtual:browser-utilities.css';
import './styles.scss';
import { SsrFixture } from './ssr-fixture';

declare global {
  interface Window {
    __hydrationErrors: string[];
    __ssrInput: Element | null;
    __ssrButton: Element | null;
  }
}

window.__hydrationErrors = [];
window.__ssrInput = document.querySelector('[data-testid="ssr-input"]');
window.__ssrButton = document.querySelector('[data-testid="ssr-button"]');
const root = document.getElementById('root');
if (!root) throw new Error('SSR fixture root is missing');

hydrateRoot(root, <SsrFixture />, {
  identifierPrefix: 'ui-ssr-',
  onRecoverableError: (error) => window.__hydrationErrors.push(String(error)),
});
