import type { ComponentProps } from 'react';
import type { Flex } from '../Flex';

/** Чем бегунок рисует выбор: сплошной `primary`, белая пилюля на серой дорожке или линия под вкладкой. */
export type TabTrackThumb = 'primary' | 'white' | 'line';

export type TabTrackProps = Omit<ComponentProps<typeof Flex>, 'ref'> & {
  /**
   * Выбранная вкладка. Бегунок едет к узлу с `state~='active'` внутри дорожки, а значение нужно,
   * только чтобы знать, КОГДА мерить заново. `null` — не выбрана ни одна, бегунок гаснет.
   */
  value: string | null;
  thumb: TabTrackThumb;
};

