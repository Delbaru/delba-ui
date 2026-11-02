import { cx } from '../../../../core';
import { Flex } from '../../../Flex';
import { Text } from '../../../Text';
import styles from './InputInlineError.module.scss';

/** Overlay leaves the native input mounted so focus and selection survive validation. */
export function InputInlineError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <Flex
        className={cx('InputInlineError', styles.InputInlineError)}
        position={['absolute', 'absolute', 'absolute']}
        top={[0, 0, 0]}
        bottom={[0, 0, 0]}
        left={[0, 0, 0]}
        right={[0, 0, 0]}
        minW={[0, 0, 0]}
        align={['center', 'center', 'center']}
        animate={{ when: 'load', effect: 'fade', duration: 'fast' }}
    >
      <Text
          id={id}
          role="alert"
          variant={['body', 'body', 'body']}
          color="var(--error)"
          className={styles.text}
          minW={[0, 0, 0]}
      >
        {message}
      </Text>
    </Flex>
  );
}
