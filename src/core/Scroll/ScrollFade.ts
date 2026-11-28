import styles from './ScrollFade.module.scss';

export function scrollFadeClass(axis: false | 'x' | 'y' | undefined) {
  if (!axis) return undefined;
  return axis === 'x' ? styles.HorizontalFade : styles.VerticalFade;
}
