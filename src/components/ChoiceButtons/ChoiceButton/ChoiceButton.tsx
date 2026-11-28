'use client';

import { useMemo } from 'react';
import { Button } from '../../Button';
import { Flex } from '../../Flex';
import { Icon } from '../../Icon';
import { Text } from '../../Text';
import { assetUrl, cx } from '#core';
import infoIcon from '#icons/controls/info.svg';
import { ChoiceInfoTooltip } from '../ChoiceInfoTooltip/ChoiceInfoTooltip';
import type { ChoiceButtonsItem, ChoiceButtonsProps } from '../ChoiceButtons.types';
import styles from './ChoiceButton.module.scss';

type ChoiceButtonProps<T extends string> = Pick<ChoiceButtonsProps<T>,
  'disabled' | 'itemClassName' | 'buttonClassName' | 'textClassName' | 'infoClassName' | 'tooltipClassName'
> & { item: ChoiceButtonsItem<T>; selected: boolean; select: (item: ChoiceButtonsItem<T>) => void };

/** One desktop option; CSS owns hover while the group owns selection. */
export function ChoiceButton<T extends string>({
  item, selected, select, disabled,
  itemClassName, buttonClassName, textClassName, infoClassName = '', tooltipClassName = '',
}: ChoiceButtonProps<T>) {
  const description = item.description;
  const tooltip = useMemo(() => description
    ? <ChoiceInfoTooltip description={description} className={tooltipClassName} />
    : undefined, [description, tooltipClassName]);

  return (
    <Flex w={['100%', null, null]} className={cx(styles.ChoiceButton, itemClassName)}>
      <Button
          h={[48, null, null]}
          w={['100%', null, null]}
          r={[12, null, null]}
          type="button"
          disabled={disabled}
          state={selected ? 'active' : undefined}
          aria-pressed={selected}
          aria-description={description}
          ui={tooltip ? { popup: { preset: 'tooltip', text: tooltip, position: 'bottom', gap: 8, surface: false } } : undefined}
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
          {description && (
            <Icon
                src={assetUrl(infoIcon)}
                w={[20, null, null]}
                h={[20, null, null]}
                strokeWidth={[1.25, null, null]}
                aria-hidden="true"
                className={cx(styles.info, infoClassName)}
            />
          )}
        </Flex>
      </Button>
    </Flex>
  );
}
