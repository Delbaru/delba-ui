import styles from '../reveal/Reveal.module.scss';

export const revealMotionClassName = styles.Reveal;
export const revealEntryAnimationName = styles['ui-reveal'];
export const revealPausedAnimationNames: ReadonlySet<string> = new Set([
    styles['ui-reveal-hold'],
    styles['ui-reveal-wait'],
]);
export const revealAnimationNames: ReadonlySet<string> = new Set([
    revealEntryAnimationName,
    styles['ui-reveal-out'],
    ...revealPausedAnimationNames,
]);
