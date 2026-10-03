export * from './components/Accordion';
export * from './components/Box';
export * from './components/Button';
export * from './components/Carousel';
export * from './components/Carousel/CarouselDots';
export * from './components/Carousel/CarouselNav';
export * from './components/Checkbox';
export * from './components/ChoiceButtons';
export * from './components/Dropdown';
export * from './components/Flex';
export * from './components/Grid';
export * from './components/Icon';
export * from './components/Img';
export * from './components/Input';
export * as phoneMask from './components/Input/lib/phone-mask';
// Формат адреса нужен и снаружи — форме, которая гасит кнопку до полного ввода. Отдаём тот же,
// которым проверяет само поле: две копии правила расходятся на первом же уточнении.
export { EMAIL_REGEX } from './components/Input/lib/use-input-behavior';
export * from './components/Marquee';
export * from './components/MediaDropDown';
export * from './components/Modal';
export * from './components/Toast';
export * from './components/Radio';
export * from './components/RichText';
export * from './components/RichTextarea';
export * from './components/Section';
export * from './components/Skeleton';
export * from './components/Select';
export * from './components/SwitchButton';
export * from './components/TabTrack';
export * from './components/Text';
export * from './components/Textarea';
export * from './components/Tooltip';
export * from './core/treePath';
export * from './components/Video';
export * from './components/VideoPlayer';
export {
  assetUrl,
  BREAKPOINT,
  createHandles,
  cx,
  focusWhenReady,
  MEDIA_QUERY,
  motion,
  Transition,
  mergeComponentStates,
  MOTION_END_BUFFER_MS,
  prefersReducedMotion,
  registerScrollProvider,
  resolveSeedField,
  scrollTo,
  unregisterScrollProvider,
  type EntityHandle,
  type FocusTarget,
  type FocusWhenReadyOptions,
  type HandlesRegistry,
  type HandlesShape,
  type TransitionResult,
  type TransitionStatus,
  type TransitionStep,
  type TransitionTime,
  type ScrollProviderApi,
  type ScrollResult,
  type ScrollTarget,
  type ScrollToOptions,
  type SeedField,
  type SeedFieldInput,
} from './core';
export { clamp, clamp01 } from './core/utils';
export { pad, pluralize, type PluralForms } from './core/base/text-format';

// Хуки и типы, которые нужны D-компонентам и страницам проекта.
export { LenisScroll, LenisScrollProvider, useLenisScroll, useLenisScrollOptional, type LenisScrollContextValue } from './components/LenisScroll';
export * from './components/SmoothScroll';
export { useOutsideDismiss, type DismissRef, type OutsideDismissInsideProps, type UseOutsideDismissOptions } from './hooks/useOutsideDismiss';
export { useAnchoredFloating, type FloatingAlign, type FloatingPlacement } from './hooks/useAnchoredFloating';
export { useMediaQuery } from './hooks/useMediaQuery';
export type { CollapseHandle } from './hooks/useCollapseMotion';
export { useInView, type UseInViewOptions } from './core/useInView';
export type { ComponentStateValue, GrowProps, LayoutSpaceProps, RadiusPropsShort, ResponsiveValue, SizePropsShort } from './core';
export type { TextRole, TextVariantName } from './core/base/typography';
export type { RevealInput, RevealKey, RevealOptions, RevealProps } from './core/reveal/reveal';
