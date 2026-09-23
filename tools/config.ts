import type { UiScale } from '../core/base/scale';
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
  /**
   * Варианты типографики проекта: `['h1', 'p1']` → классы `text_h1`, `text_p1` на токенах
   * `--font-h1`, `--tt-h1`, `--ls-h1`. Не задан — прежний набор кита. `UiTypography` проекта
   * выводится из этого же списка (README, «Типографика»), второго нет.
   */
  readonly typography?: ExtractOptions['typography'];
  /** Куда раскладывать `public/` кита. По умолчанию `public`. */
  readonly public?: string;
  /** Стили темы для договора токенов. По умолчанию `theme`. */
  readonly theme?: string | readonly string[];
  /** Папки под счётчик красных линий. По умолчанию `['src']`. */
  readonly rules?: readonly string[];
  /** Планка красных линий. По умолчанию `.rules-baseline.json`. */
  readonly baseline?: string;
  readonly skins?: UiSkins;
  /**
   * Базовые ширины макета, px: `1rpx = окно / база` на своей полосе, десктоп шире `max` не растёт.
   * Из них генерируются `--rpx` и `sizes` у `Img`. Умолчания: 320 / 768 / 1920, потолок 2560.
   */
  readonly scale?: Partial<UiScale>;
}
