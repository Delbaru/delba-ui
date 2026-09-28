'use client';

import { useEffect } from 'react';

const SELECTOR = '[data-fancybox]';

let bindPromise: Promise<void> | null = null;
let bound = false;
let armed = false;

// Лайтбокс (≈100 КБ JS и 32 КБ CSS) нужен только тому, кто открыл фото: грузится вместе со стилями
// по первому наведению или фокусу, а не при гидрации каждой страницы с галереей.
function ensureFancyboxBound() {
  if (bindPromise) {
    return bindPromise;
  }

  bindPromise = import('./fancyboxLoader').then(({ Fancybox }) => {
    Fancybox.bind(SELECTOR);
    bound = true;
  });

  return bindPromise;
}

const target = (event: Event) => (event.target instanceof Element ? event.target.closest<HTMLElement>(SELECTOR) : null);

function arm() {
  if (armed) return;
  armed = true;

  const warm = (event: Event) => {
    if (target(event)) void ensureFancyboxBound();
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  // Клик раньше загрузки (тач без наведения, быстрая мышь) не уводит на файл картинки: ждём и повторяем.
  document.addEventListener('click', (event) => {
    const el = target(event);
    if (!el || bound) return;
    event.preventDefault();
    void ensureFancyboxBound().then(() => el.click());
  }, true);
}

export function useFancybox(enabled: boolean) {
  useEffect(() => {
    if (enabled) arm();
  }, [enabled]);
}
