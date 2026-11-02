import { cx } from '../../../core';
import { Flex } from '../../Flex';
import { Icon } from '../../Icon';
import { Text } from '../../Text';
import { TOAST_TONES } from '../Toast.config';
import type { ToastItem } from '../Toast.types';
import styles from './ToastCard.module.scss';

export function ToastCard({ item, onExited }: { item: ToastItem; onExited: () => void }) {
  const tone = TOAST_TONES[item.tone ?? 'success'];

  return (
    <Flex
        className={cx('ToastCard', styles.ToastCard)}
        collapse={{ open: item.open, appear: true, gap: [12, 12, 12], fade: true, onEnd: item.open ? undefined : onExited }}
        dir={['column', 'column', 'column']}
    >
      <Flex
          align={['center', 'center', 'center']}
          gap={[12, 12, 12]}
          p={[[16, 20], [16, 20], [16, 20]]}
          r={[16, 16, 16]}
          maxW={[560, 560, 560]}
          border={['calc(1 * var(--rpx)) solid var(--line)', 'calc(1 * var(--rpx)) solid var(--line)', 'calc(1 * var(--rpx)) solid var(--line)']}
          bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
          className={styles.card}
      >
        <Icon
            src={tone.glyph}
            w={[18, 18, 18]}
            h={[18, 18, 18]}
            rootW={[32, 32, 32]}
            rootH={[32, 32, 32]}
            rootMinW={[32, 32, 32]}
            rootR={[999, 999, 999]}
            rootBg={[tone.fill, tone.fill, tone.fill]}
            stroke='var(--white-100)'
            aria-hidden
        />
        <Flex dir={['column', 'column', 'column']} gap={[4, 4, 4]}>
          <Text variant={['body', 'body', 'body']}>{item.title}</Text>
          {item.description && <Text
              variant={['caption', 'caption', 'caption']}
              color='var(--text-muted)'
          >{item.description}</Text>}
        </Flex>
      </Flex>
    </Flex>
  );
}
