import type { ReactNode } from 'react';
import type { ButtonProps } from '../../components/Button/Button.types';
import type { FlexProps } from '../../components/Flex/Flex.types';
import type { WithRef } from '../base/with-ref';
import type { NavigationOptions } from '../Navigation';

export type DisclosureHeading = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type Direction = NonNullable<FlexProps['dir']>;
type TriggerLayout = Pick<ButtonProps, 'w' | 'justifyContent' | 'textAlign'>;

export interface DisclosureConfiguration {
  readonly defaults: {
    readonly headingAs: DisclosureHeading;
    readonly collapsible: boolean;
    readonly dir: Direction;
    readonly item?: Readonly<{ dir: Direction; trigger: Readonly<TriggerLayout> }>;
  };
  readonly navigation: Readonly<NavigationOptions>;
}

export interface DisclosureDefinition extends DisclosureConfiguration {
  readonly token: symbol;
}

type DisclosureSurface = Omit<FlexProps,
  | 'defaultValue' | 'ui' | 'dangerouslySetInnerHTML'
  | 'collapse' | 'collapseGap' | 'collapseFade' | 'collapseAxis' | 'collapseAppear'
  | 'collapseOverflowVisible' | 'collapseKeepMounted' | 'onCollapseEnd' | 'onCollapseFound'
  | 'href' | 'target' | 'rel' | 'download' | 'newTab' | 'nofollow' | 'noreferrer' | 'linkState'
> & {
  ui?: Omit<NonNullable<FlexProps['ui']>, 'collapse' | 'disclosure'>;
};

type DisclosureGroupProps = DisclosureSurface & {
  /** Уровень заголовка над триггером. Пункт может переопределить его. */
  headingAs?: DisclosureHeading;
  /** Общий индикатор пунктов. Для отдельного пункта `null` скрывает индикатор. */
  indicator?: ReactNode;
  /** Повторное нажатие закрывает единственный открытый пункт. В multiple закрытие доступно всегда. */
  collapsible?: boolean;
};

export type DisclosureSingleProps = DisclosureGroupProps & {
  multiple?: false;
  /** Открытый ключ. `null` закрывает все пункты в управляемом режиме. */
  value?: string | null;
  /** Открытый ключ в неуправляемом режиме при первом показе. */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
};

export type DisclosureMultipleProps = DisclosureGroupProps & {
  multiple: true;
  /** Открытые ключи в управляемом режиме. */
  value?: readonly string[];
  /** Открытые ключи в неуправляемом режиме при первом показе. */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
};

export type DisclosureProps = DisclosureSingleProps | DisclosureMultipleProps;

export type DisclosureTriggerOptions = WithRef<Omit<ButtonProps,
  | 'id' | 'role' | 'type' | 'children' | 'content' | 'disabled' | 'dangerouslySetInnerHTML'
  | 'aria-expanded' | 'aria-controls' | 'aria-disabled' | 'href' | 'ui'
>, HTMLElement> & {
  /** Содержимое кнопки раскрытия. */
  content: ReactNode;
  ui?: Pick<NonNullable<ButtonProps['ui']>, 'popup'>;
};

type DisclosureItemSurface = Omit<DisclosureSurface, 'animate'>;
type DisclosurePanelOptions = WithRef<Omit<DisclosureItemSurface, 'children' | 'id' | 'role' | 'aria-labelledby'>, HTMLElement>;

export interface DisclosureItemProps extends DisclosureItemSurface {
  /** Стабильный уникальный ключ пункта внутри группы. */
  value: string;
  /** Содержимое и настройки нативной кнопки раскрытия. */
  trigger: DisclosureTriggerOptions;
  /** Содержимое панели. */
  children?: ReactNode;
  /** Уровень заголовка. По умолчанию используется значение группы. */
  headingAs?: DisclosureHeading;
  /** Индикатор пункта. `null` скрывает общий индикатор. */
  indicator?: ReactNode;
  /** Пункт пропускается при навигации и не переключается кнопкой. */
  disabled?: boolean;
  /** Раскладка, атрибуты и ref панели. */
  panelProps?: DisclosurePanelOptions;
}
