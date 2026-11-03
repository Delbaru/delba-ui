'use client';

import { useMemo } from 'react';
import { cx } from '../../../../../core';
import styles from './TextRevealLayer.module.scss';

const NBSP = String.fromCharCode(0xa0); // U+00A0, строим регэксп в рантайме — без литерала nbsp в исходнике
const SPLIT_WS = new RegExp('([^\\S' + NBSP + ']+)');
const IS_WS = new RegExp('^[^\\S' + NBSP + ']+$');

type LayerMode = 'in' | 'out' | 'idle';

// Бьём строку на слова и разрывные пробелы (через capture-split). Слово (в т.ч. склеенное nbsp) не переносится
// по буквам (inline-block + nowrap), разрывный пробел — отдельный токен, чтобы перенос был допустим между словами.
function toTokens(text: string): string[] {
  return text.split(SPLIT_WS).filter((part) => part.length > 0);
}

interface LayerProps {
  text: string;
  mode: LayerMode;
  /** Сколько ведущих/замыкающих символов — общие с соседним слоем (рендерим статично, без анимации). */
  staticPrefix: number;
  staticSuffix: number;
}

export function TextRevealLayer({ text, mode, staticPrefix, staticSuffix }: LayerProps) {
  // Токены + глобальный старт-индекс каждого (символ считаем и в пробелах) — чтобы сопоставить с prefix/suffix.
  const { tokens, starts, total } = useMemo(() => {
    const tks = toTokens(text);
    let acc = 0;
    const st = tks.map((t) => {
      const s = acc;
      acc += Array.from(t).length;
      return s;
    });
    return { tokens: tks, starts: st, total: acc };
  }, [text]);

  return (
    <span
      data-reveal-layer=""
      data-reveal-mode={mode}
      className={cx(
          styles.TextRevealLayer,
          'ui-reveal-layer',
          mode === 'in' && 'ui-reveal-in',
          mode === 'out' && 'ui-reveal-out',
      )}
      aria-hidden={mode === 'out' ? true : undefined}
    >
      {tokens.map((token, tokenIdx) => {
        if (IS_WS.test(token)) {
          return <span key={`s-${tokenIdx}`} className={'ui-reveal-space'}>{token}</span>;
        }

        const start = starts[tokenIdx] ?? 0;
        return (
          <span key={`w-${tokenIdx}`} className={'ui-reveal-word'}>
            {Array.from(token).map((ch, i) => {
              const gi = start + i;
              // Статичный символ (общий край) не несёт data-reveal-char → не анимируется и не участвует в волне.
              const isStatic = gi < staticPrefix || gi >= total - staticSuffix;
              return (
                <span
                    key={i}
                    {...(isStatic ? null : { 'data-reveal-char': '' })}
                    className={'ui-reveal-char'}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
