import type { MouseEventHandler, ReactElement, ReactNode, RefObject } from 'react';
import type { ComponentStateValue } from '../../core';
import type { FloatingDismissReason } from '../../hooks/useFloatingSurface';
import type { OpenAnimate } from '../../core/reveal/reveal';
import type { BoxProps } from '../Box';
import type { CollapseSettings } from '../Collapse/CollapseWrap';
import type { DropdownBackdropOptions } from './DropdownBackdrop/DropdownBackdrop';

export interface DropdownTriggerProps {
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export interface DropdownPanelOptions extends Omit<BoxProps, 'children' | 'collapse' | 'animate'> {
  /** An owner's open drives enter/exit; without it the existing collapse behavior is preserved. */
  animate?: BoxProps['animate'] | OpenAnimate;
  /** Geometry anchor; keyboard focus and trigger semantics remain attached to trigger. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Minimum distance from viewport edges in native pixels. Default 8. */
  viewportPadding?: number;
  /** DOM data-атрибуты поверхности панели, включая проектные маркеры портала. */
  [attribute: `data-${string}`]: string | number | boolean | undefined;
  /** Край триггера, к которому прижата панель. */
  side?: 'start' | 'center' | 'end';
  /** Зазор от триггера в дизайн-единицах. */
  offset?: number;
  /** Вынести панель из обрезающего контейнера в слой страницы или активной Modal. */
  portal?: boolean;
  /** Растянуть панель по ширине триггера. */
  matchTriggerWidth?: boolean;
  /** Сохранять закрытое содержимое в DOM; false удаляет его после анимации закрытия. */
  keepMounted?: boolean;
  /** CSS-переменные оформления, которые нужно перенести из корня в портал. */
  inheritVariables?: readonly `--${string}`[];
  /** Настройки общего collapse; открытие определяется состоянием Dropdown. */
  collapse?: Omit<CollapseSettings, 'ref' | 'onOpenChange' | 'keepMounted' | 'onFound'>;
}

interface DropdownBaseProps extends Omit<BoxProps, 'children'> {
  /** Dismissal rules. Outside pointer dismissal remains enabled; blur and Escape default true. */
  closeOn?: { blur?: boolean; escape?: boolean };
  /** Logical focus regions belonging to an externally anchored control. */
  focusRegions?: readonly RefObject<HTMLElement | null>[];
  /** Menu navigation or content-owned keyboard behavior. Default menu. */
  keyboard?: 'menu' | 'content';
  /** Keep pointer actions from moving focus out of the owning field. */
  preserveFocus?: boolean;
  /** Restore focus after a confirmed close. Defaults to the trigger/anchor. */
  returnFocus?: RefObject<HTMLElement | null> | false;
  /** Painted surface ref, for keyboard entry from an external field. */
  surfaceRef?: RefObject<HTMLElement | null>;
  /** Закрывающий клик не активирует содержимое страницы под панелью. */
  blockOutsideClick?: boolean;

  /** Содержимое панели; функция получает команду закрытия. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Размещение, оформление и раскрытие выпадающей панели. */
  panel?: DropdownPanelOptions;
  /** Optional non-focusable scrim; uses the same portal and outside-dismiss owner as the panel. */
  backdrop?: DropdownBackdropOptions;
  /** Состояния оформления корня и его портальной области. */
  state?: ComponentStateValue;
}

export type DropdownChangeReason = FloatingDismissReason | 'trigger' | 'content' | 'disabled';

type DropdownAnchor =
  | {
      /** Clickable opener; its handler can cancel toggling. */ trigger: ReactElement<DropdownTriggerProps>;
      anchorRef?: never;
    }
  | {
      /** External geometry anchor; this variant creates no trigger or root wrapper. */ anchorRef: RefObject<HTMLElement | null>;
      trigger?: never;
    };

export type DropdownProps = DropdownBaseProps &
  DropdownAnchor &
  (
    | {
        /** Управляемое открытие: единственный владелец — вызывающий компонент. */
        open: boolean;
        /** Запрос изменить открытие; Dropdown не хранит его вторую копию. */
        onOpenChange: (open: boolean, reason: DropdownChangeReason) => void;
        defaultOpen?: never;
      }
    | {
        open?: undefined;
        /** Начальное открытие в неуправляемом режиме. */
        defaultOpen?: boolean;
        /** Уведомление об открытии и закрытии в неуправляемом режиме. */
        onOpenChange?: (open: boolean, reason: DropdownChangeReason) => void;
      }
  );
