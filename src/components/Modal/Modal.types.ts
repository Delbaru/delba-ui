import type { CSSProperties, MouseEventHandler, ReactElement } from 'react';
import type {
  BoxLayoutProps,
  LayoutSpaceProps,
  ResponsiveValue,
  SpaceValue,
  StateLinkInput,
} from '../../core';
import type { OpenAnimate } from '../../core/reveal/reveal';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { ScrollbarOptions } from '../ScrollArea/scrollbar';
type PresetKey = 'default' | 'fullWidth';

export interface ModalCloseOptions {
  /** Declarative dialogs close when this viewport breakpoint becomes active. */
  breakpoint?: 'desktop' | 'below' | 'mobile' | 'tablet';
  /** Close on an overlay click. Defaults to true. */
  overlay?: boolean;
  /** Close on Escape unless a nested control already consumed it. Defaults to true. */
  escape?: boolean;
}

export interface ModalScrollOptions extends LayoutSpaceProps {
  /** Native scrollbar appearance, shared with ScrollArea. Does not add a scroll container. */
  scrollbar?: ScrollbarOptions;
  /** Reserve the legacy scrollbar padding. Set false for a panel with its own padding. */
  gutter?: boolean;
}

export interface ModalTriggerProps {
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: 'dialog';
}

export interface ModalSurfaceProps extends BoxLayoutProps, SharedMotionProps<OpenAnimate> {
  id?: string;
  children?: React.ReactNode | ((close: () => void) => React.ReactNode);
  /** Dialog controls outside the scrolling content; remain inside its focus boundary. */
  controls?: React.ReactNode;
  className?: string;
  rootClassName?: string;
  overlayClassName?: string;
  style?: CSSProperties;
  rootStyle?: CSSProperties;
  overlayStyle?: CSSProperties;

  /** Геометрия панели. Проектные наборы оформления задаются компонентом потребителя. */
  layout?: ResponsiveValue<PresetKey>;
  /** @deprecated Используйте layout; оставлен для существующих потребителей. */
  preset?: ResponsiveValue<PresetKey>;

  closeOnOverlayClick?: boolean;
  /** Dismissal rules; grouped settings take precedence over the legacy overlay flag. */
  closeOn?: ModalCloseOptions;
  /** Padding of the sole scroll container inside the panel. */
  scroll?: ModalScrollOptions;

  /** Снять клип с панели для содержимого, которое должно выступать за её границы.
   *  Выпадающий список Select использует портал и этой настройки не требует. Платой — нет своей
   *  прокрутки: длинное содержимое тогда ограничивает и прокручивает вызывающий. */
  overflowVisible?: boolean;

  rootP?: LayoutSpaceProps['p'];
  rootPt?: ResponsiveValue<SpaceValue>;
  rootPr?: ResponsiveValue<SpaceValue>;
  rootPb?: ResponsiveValue<SpaceValue>;
  rootPl?: ResponsiveValue<SpaceValue>;
  rootM?: LayoutSpaceProps['m'];
  rootMt?: ResponsiveValue<SpaceValue>;
  rootMr?: ResponsiveValue<SpaceValue>;
  rootMb?: ResponsiveValue<SpaceValue>;
  rootMl?: ResponsiveValue<SpaceValue>;

  alignItems?: ResponsiveValue<
    'stretch' | 'center' | 'flex_start' | 'flex_end' | 'start' | 'end' | 'baseline'
  >;
  justifyContent?: ResponsiveValue<
    'start' | 'end' | 'center' | 'space_between' | 'space_around' | 'space_evenly'
  >;

  color?: string;

  'aria-label'?: string;
  'aria-labelledby'?: string;
  'data-point-events'?: string;

  linkState?: StateLinkInput;
}

export type ModalProps = ModalSurfaceProps & {
  /** Declarative opener. Its click handler runs first and can cancel opening. */
  trigger?: ReactElement<ModalTriggerProps>;
} & (
    | {
        /** Controlled opening, owned by the caller. */
        open: boolean;
        /** Request to change the controlled opening. */
        onOpenChange: (open: boolean) => void;
        defaultOpen?: never;
      }
    | {
        open?: undefined;
        /** Initial opening in uncontrolled declarative mode. */
        defaultOpen?: boolean;
        /** Notification when uncontrolled opening changes. */
        onOpenChange?: (open: boolean) => void;
      }
  );
