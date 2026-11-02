'use client';

import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { Text } from '../../Text';
import { cx } from '../../../core';
import { ChoiceInfoTooltip } from '../ChoiceInfoTooltip/ChoiceInfoTooltip';
import type { ChoiceButtonsItem, ChoiceButtonsProps } from '../ChoiceButtons.types';
import styles from './ChoiceButton.module.scss';

type ChoiceButtonProps<T extends string> = Pick<ChoiceButtonsProps<T>,
  'disabled' | 'itemClassName' | 'buttonClassName' | 'textClassName' | 'infoClassName' | 'tooltipClassName'
> & { item: ChoiceButtonsItem<T>; selected: boolean; tooltipId: string; select: (item: ChoiceButtonsItem<T>) => void };

/** One desktop option; CSS owns hover while the group owns selection. */
export function ChoiceButton<T extends string>({
  item, selected, tooltipId, select, disabled,
  itemClassName, buttonClassName, textClassName, infoClassName = '', tooltipClassName = '',
}: ChoiceButtonProps<T>) {
  return (
    <Flex
        w={['100%', null, null]}
        className={cx('ChoiceButton', styles.ChoiceButton, itemClassName)}
    >
      <Button
          h={[48, null, null]}
          w={['100%', null, null]}
          r={[12, null, null]}
          type="button"
          disabled={disabled}
          state={selected ? 'active' : undefined}
          aria-pressed={selected}
          aria-describedby={item.description ? tooltipId : undefined}
          onClick={() => select(item)}
          className={cx(styles.button, buttonClassName)}
      >
        <Flex dir={['row', null, null]} align={['center', null, null]} gap={[8, null, null]}>
          <Text
              variant={['body', null, null]}
              color="var(--text-muted)"
              className={cx(styles.label, textClassName)}
          >
            {item.label}
          </Text>
          {item.description && (
            <ChoiceInfoTooltip
                id={tooltipId}
                description={item.description}
                infoClassName={infoClassName}
                tooltipClassName={tooltipClassName}
            />
          )}
        </Flex>
      </Button>
    </Flex>
  );
}
