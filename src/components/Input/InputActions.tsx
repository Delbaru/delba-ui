import type { MouseEvent } from 'react';

import { assetUrl, cx } from '../../core';
import { Flex } from '../Flex';
import { Icon } from '../Icon';

import calendarIcon from '../../../assets/icons/ui/calendar/style-1/calendar.svg';
import chevronIcon from '../../../assets/icons/ui/arrows/style-3/arrow.svg';
import gazeAwayIcon from '../../../assets/icons/ui/eye/style-1/gaze-away.svg';
import eyeIcon from '../../../assets/icons/ui/eye/style-1/eye.svg';
import styles from './Input.module.scss';

// Pointer-действие меняет поле, сохраняя его фокус и каретку.
function keepInputFocus(event: MouseEvent<Element>) {
    event.preventDefault();
}

type PasswordToggleProps = {
    visible: boolean;
    revealed: boolean;
    onToggle: () => void;
};

export function PasswordToggle({ visible, revealed, onToggle }: PasswordToggleProps) {
    if (!visible) return null;

    return (
        <Icon
            src={revealed ? assetUrl(gazeAwayIcon) : assetUrl(eyeIcon)}
            animate="swap"
            rootW={[24, 24, 24]}
            rootH={[24, 24, 24]}
            w={[24, 24, 24]}
            h={[24, 24, 24]}
            rootClassName={styles.passwordToggle}
            role="button"
            tabIndex={0}
            aria-label={revealed ? 'Скрыть пароль' : 'Показать пароль'}
            data-input-action="true"
            onMouseDown={keepInputFocus}
            onClick={onToggle}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onToggle();
            }}
        />
    );
}

export function DateToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
    if (!visible) return null;

    return (
        <Icon
            src={assetUrl(calendarIcon)}
            rootW={[48, null, null]}
            rootH={[48, null, null]}
            w={[24, null, null]}
            h={[24, null, null]}
            rootR={[16, null, null]}
            rootBg={['var(--background)', 'var(--background)', 'var(--background)']}
            rootClassName={styles.dateToggle}
            data-input-action="true"
            onMouseDown={keepInputFocus}
            onClick={onToggle}
        />
    );
}

export function NumberControls({ visible, onStep }: { visible: boolean; onStep: (direction: 1 | -1) => void }) {
    if (!visible) return null;

    return (
        <Flex
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            gap={[4, null, null]}
            className={styles.numberArrows}
        >
            <Icon
                src={assetUrl(chevronIcon)}
                rootW={[12, null, null]}
                rootH={[8, null, null]}
                w={[16, null, null]}
                h={['auto', null, null]}
                rootClassName={cx(styles.btn, styles.up)}
                data-input-action="true"
                onMouseDown={keepInputFocus}
                onClick={() => onStep(1)}
            />
            <Icon
                src={assetUrl(chevronIcon)}
                rootW={[12, null, null]}
                rootH={[8, null, null]}
                w={[16, null, null]}
                h={['auto', null, null]}
                rootClassName={cx(styles.btn, styles.down)}
                data-input-action="true"
                onMouseDown={keepInputFocus}
                onClick={() => onStep(-1)}
            />
        </Flex>
    );
}
