import { cx } from '../../../../core';
import { maskGroups, type PhoneFormat } from '../../../../core/fields/phone';
import { Flex } from '../../../Flex';
import { Text } from '../../../Text';
import styles from './InputPhoneMask.module.scss';

/** Visual hint; the native input owns focus, value and accessible name. */
export function InputPhoneMask({ format }: { format: PhoneFormat }) {
  return (
    <Flex
        aria-hidden="true"
        className={cx('InputPhoneMask', styles.InputPhoneMask)}
        gap={[4, 2, 4]}
        align={['center', 'center', 'center']}
    >
      {maskGroups(format).map((group, groupIndex) => (
        <Flex key={groupIndex} align={['center', 'center', 'center']}>
          {group.map((part, partIndex) => (
            <Text
                key={partIndex}
                as="span"
                variant={['inherit', 'inherit', 'inherit']}
                className={part.dim ? styles.dim : undefined}
            >
              {part.text}
            </Text>
          ))}
        </Flex>
      ))}
    </Flex>
  );
}
