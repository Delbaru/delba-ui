import styles from './Container.module.scss';

export const containerClass = (container: boolean | undefined) =>
  container ? styles.Container : undefined;
