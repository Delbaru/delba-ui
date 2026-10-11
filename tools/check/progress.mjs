import { clearLine, cursorTo } from 'node:readline';

import { formatProgress } from './format.mjs';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Возвращает остановку индикатора; логи CI и файлов остаются без управляющих последовательностей. */
export function startProgress(name, { stream = process.stdout, color = false } = {}) {
  if (!stream.isTTY || process.env.CI || process.env.TERM === 'dumb') return () => {};
  let frame = 0;
  let stopped = false;
  const clear = () => { cursorTo(stream, 0); clearLine(stream, 0); };
  const draw = () => {
    clear();
    stream.write(formatProgress(name, frames[frame++ % frames.length], { color }));
  };
  draw();
  const timer = setInterval(draw, 100);
  timer.unref();
  return () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    clear();
  };
}
