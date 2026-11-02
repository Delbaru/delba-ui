'use client';

import { Flex } from '../../Flex';
import { Text } from '../../Text';
import { UI_MESSAGES } from '../../../core/base/messages';
import { cx } from '../../../core';
import { useLexicalTextareaToolbar } from './LexicalTextareaToolbar.model';
import { LexicalTextareaToolbarButton } from './LexicalTextareaToolbarButton/LexicalTextareaToolbarButton';
import styles from './LexicalTextareaToolbar.module.scss';

export function LexicalTextareaToolbar({ hasVariables, allowLink = true }: { hasVariables: boolean; allowLink?: boolean }) {
  const toolbarGroups = useLexicalTextareaToolbar(allowLink);

  return (
    <Flex
        className={cx('LexicalTextareaToolbar', styles.LexicalTextareaToolbar)}
        dir={['row', null, null]}
        wrap={['wrap', 'wrap', 'wrap']}
        align={['center', null, null]}
        gap={[16, null, null]}
        grow={[1, 1, 1]}
    >
      {toolbarGroups.map((group, groupIndex) => (
        <Flex
            key={groupIndex}
            dir={['row', 'row', 'row']}
            align={['center', 'center', 'center']}
            gap={[16, 16, 16]}
        >
          {group.map((action) => (
            <LexicalTextareaToolbarButton
                key={action.ariaLabel}
                iconSrc={action.iconSrc}
                isActive={action.isActive}
                onClick={action.onClick}
                ariaLabel={action.ariaLabel}
            />
          ))}

          {groupIndex < toolbarGroups.length - 1 && <Flex
              w={[1, null, null]}
              h={[20, null, null]}
              bg={['var(--line)', 'var(--line)', 'var(--line)']}
          />}
        </Flex>
      ))}

      {hasVariables && (
        <Text variant={['micro', null, null]} color='var(--text-muted)'>
          {UI_MESSAGES.richTextarea.variableHint}
        </Text>
      )}
    </Flex>
  );
}
