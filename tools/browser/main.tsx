import { Profiler, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-cube';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-flip';
import 'virtual:browser-utilities.css';

import './styles.scss';
import { BrowserFixture } from './fixture';
import { ModalProvider } from '../../src/components/Modal/ModalProvider';
import { createSmoothScroll } from '../../src/components/SmoothScroll/engine';

const root = document.getElementById('root');

if (!root) throw new Error('Browser fixture root is missing');
window.__createSmoothScroll = createSmoothScroll;

createRoot(root).render(
  <Profiler id="browser-fixture" onRender={(_id, phase, actualDuration, baseDuration) => {
    window.__profileSamples ??= [];
    window.__profileSamples = [...window.__profileSamples, { phase, actualDuration, baseDuration }].slice(-20);
    const output = document.querySelector<HTMLOutputElement>('[data-testid="react-profile"]');
    if (output) output.value = JSON.stringify(window.__profileSamples);
  }}>
    <StrictMode>
      <ModalProvider>{location.search === '?smooth'
        ? <main style={{ height: 2000 }}><h1>Delba UI browser regression fixture</h1></main>
        : <BrowserFixture />}</ModalProvider>
    </StrictMode>
  </Profiler>,
);
