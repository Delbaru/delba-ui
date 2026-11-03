import { Icon } from '../../Icon';
import { cx } from '../../../core';
import styles from './IconSwap.module.scss';

// Плавная смена двух иконок (crossfade + scale) в фикс-боксе 24×24 — ширина не скачет.
export function IconSwap({ active, a, b }: { active: boolean; a: string; b: string }) {
    return (
        <span className={styles.IconSwap} data-active={active ? 'b' : 'a'}>
            <span className={cx(styles.iconSwapItem, styles.iconSwapA)}><Icon
                src={a}
                w={[24, 24, 24]}
                h={[24, 24, 24]}
                fill="var(--white-100)"
            /></span>

            <span className={cx(styles.iconSwapItem, styles.iconSwapB)}><Icon
                src={b}
                w={[24, 24, 24]}
                h={[24, 24, 24]}
                fill="var(--white-100)"
            /></span>
        </span>
    );
}
