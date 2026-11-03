import type { ReactNode } from 'react';
import type { FlexProps } from '../Flex';
import type { AccordionItemTriggerButtonProps, AccordionItemTriggerOptions } from './trigger-options';

/** Уровень заголовка-обёртки триггера. */
export type AccordionHeading = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// Сворачивание, ссылка и своп принадлежат самому аккордеону — снаружи их не пробросить.
export type ShellOmit =
  | 'children'
  | 'defaultValue'
  | 'collapse'
  | 'collapseGap'
  | 'collapseFade'
  | 'collapseAxis'
  | 'collapseAppear'
  | 'collapseOverflowVisible'
  | 'collapseKeepMounted'
  | 'onCollapseEnd'
  | 'onCollapseFound'
  | 'href'
  | 'target'
  | 'rel'
  | 'download'
  | 'newTab'
  | 'nofollow'
  | 'noreferrer'
  | 'linkState'
  | 'animate';
type AccordionRootOmit = Exclude<ShellOmit, 'animate'>;

type AccordionShellProps = Omit<FlexProps, AccordionRootOmit> & {
  children?: ReactNode;
  /** Иконка-индикатор для всех пунктов (плюс, стрелка): встаёт в триггер справа, `aria-hidden`.
   *  Поворот и цвет — у проекта по `[state~='open']`. Пункт перебивает своим `indicator`. */
  indicator?: ReactNode;
  /** Уровень заголовка над триггером для всех пунктов; по умолчанию `h3`. Пункт перебивает. */
  headingAs?: AccordionHeading;
};

export type AccordionSingleProps = AccordionShellProps & {
  /** Несколько открытых пунктов сразу. Без него открыт максимум один. */
  multiple?: false;
  /** Открытый пункт (управляемый режим); `null` — все закрыты. */
  value?: string | null;
  /** Открытый пункт на старте (неуправляемый режим). */
  defaultValue?: string | null;
  /** Пункт открыли или закрыли; `null` — закрыт последний. */
  onValueChange?: (value: string | null) => void;
  /** Можно закрыть единственный открытый пункт повторным нажатием. По умолчанию `true`. */
  collapsible?: boolean;
};

export type AccordionMultipleProps = AccordionShellProps & {
  /** Несколько открытых пунктов сразу: значение — массив. */
  multiple: true;
  /** Открытые пункты (управляемый режим). */
  value?: readonly string[];
  /** Открытые пункты на старте (неуправляемый режим). */
  defaultValue?: readonly string[];
  /** Новый набор открытых пунктов. */
  onValueChange?: (value: string[]) => void;
  /** В режиме `multiple` любой пункт закрывается всегда — проп ни на что не влияет. */
  collapsible?: boolean;
};

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

export interface AccordionItemProps extends Omit<FlexProps, ShellOmit> {
  /** Ключ пункта: им пункт значится в `value` аккордеона. Уникален в пределах аккордеона. */
  value: string;
  /** Содержимое кнопки-триггера или её настройки с `content`; настройки объекта имеют приоритет над `triggerProps`. */
  trigger: ReactNode | AccordionItemTriggerOptions;
  /** Содержимое панели. */
  children?: ReactNode;
  /** Уровень заголовка над триггером; по умолчанию — `headingAs` аккордеона. */
  headingAs?: AccordionHeading;
  /** Иконка-индикатор этого пункта; по умолчанию — `indicator` аккордеона. `null` — без иконки. */
  indicator?: ReactNode;
  /** Пункт не раскрывается и пропускается стрелками. */
  disabled?: boolean;
  /** Совместимые пропсы кнопки-триггера. При конфликте настройки `trigger` имеют приоритет; `className` объединяется. aria, disabled и обработчик задаёт кит. */
  triggerProps?: AccordionItemTriggerButtonProps;
  /** Пропсы панели (раскладка, отступы содержимого). Сворачивание и роль ставит кит. */
  panelProps?: Omit<FlexProps, ShellOmit | 'id' | 'role' | 'aria-labelledby'>;
}
