import { useRef } from 'react';

import { Flex } from '../Flex';
import { Text } from '../Text';
import styles from './Input.module.scss';

type ErrorProps = { id?: string; message?: string };

export function InputInlineError({ id, message }: ErrorProps) {
    if (!message) return null;

    // Анимируется только слой ошибки: сам input сохраняет фокус и каретку.
    return (
        <Flex className={styles.inlineError} animation="fadeIn">
            <Text
                as="div"
                id={id}
                role="alert"
                variant={['body', 'body', 'body']}
                color="var(--error)"
                className={styles.inlineErrorText}
            >{message}</Text>
        </Flex>
    );
}

export function InputBelowError({ id, message }: ErrorProps) {
    // Текст остаётся на месте до конца сворачивания строки.
    const lastMessage = useRef('');
    if (message) lastMessage.current = message;

    return (
        <Flex
            collapse={{ open: !!message, gap: [8, null, null], fade: true }}
            className={styles.belowError}
        >
            <Text
                as="div"
                id={id}
                role="alert"
                variant={['caption', 'caption', 'caption']}
                color="var(--error)"
            >{message ?? lastMessage.current}</Text>
        </Flex>
    );
}
