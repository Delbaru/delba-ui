import type { ExtractOptions } from './utilities/extract';

/** Словари осей шкур и папка компонентов проекта (см. `skin/`). */
export interface UiSkins {
  /** Папка компонентов: в её подпапках ищутся `*.skin.ts`, рядом пишется `_states.scss`. */
  readonly dir: string;
  readonly fills: Readonly<Record<string, string>>;
  /** Линия — [толщина в rpx, цвет]. */
  readonly lines: Readonly<Record<string, readonly [number, string]>>;
  readonly texts: Readonly<Record<string, string>>;
}

/** Конфиг проекта для `tools/cli.mjs` (default export `ui.config.ts`). Пути — от папки проекта. */
export interface UiConfig {
  /** Исходники для генератора утилит; сам кит сканируется всегда. По умолчанию `['src']`. */
  readonly scan?: readonly string[];
  /** Значения, которые на вызовах пишут именем (`size='lg'`), а скан видит только литералы. */
  readonly seeds?: ExtractOptions['seeds'];
  /** Куда раскладывать `public/` кита. По умолчанию `public`. */
  readonly public?: string;
  /** Стили темы для договора токенов. По умолчанию `theme`. */
  readonly theme?: string | readonly string[];
  /** Папки под счётчик красных линий. По умолчанию `['src']`. */
  readonly rules?: readonly string[];
  /** Планка красных линий. По умолчанию `.rules-baseline.json`. */
  readonly baseline?: string;
  readonly skins?: UiSkins;
}
