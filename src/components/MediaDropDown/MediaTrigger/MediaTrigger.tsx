'use client';

import { assetUrl, cx } from '../../../core';
import { Flex } from '../../Flex';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import type { MediaDropDownModel } from '../MediaDropDown.model';
import styles from './MediaTrigger.module.scss';
import { resolveSvgAssetSource } from '../../../core/base/svg-asset';
import SkipNextOutlineIconAsset from '../../RichTextarea/assets/skip-next-outline.svg';
import eyeIcon from '../../../../assets/icons/ui/eye/style-1/eye.svg';
import deleteIcon from '../../../../assets/icons/ui/delete/style-1/delete.svg';
const SkipNextOutlineIcon = resolveSvgAssetSource(SkipNextOutlineIconAsset) ?? '';

export function MediaTrigger({ media }: { media: Pick<MediaDropDownModel, 'popup' | 'selection' | 'type' | 'disabled'> }) {
  return (
    <Flex
      w={['100%', '100%', '100%']}
      h={[48, 48, 48]} gap={[12, 12, 12]} p={[8, 8, 8]}
      bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
      border={['calc(var(--rpx) * 1) solid var(--line)', 'calc(var(--rpx) * 1) solid var(--line)', 'calc(var(--rpx) * 1) solid var(--line)']}
      r={[16, 16, 16]}
      align={['center', 'center', 'center']}
      justify={['space_between', 'space_between', 'space_between']}
      className={cx('MediaTrigger', styles.MediaTrigger)}
      data-open={media.popup.open}
      role="button"
      tabIndex={media.disabled ? -1 : 0}
      aria-expanded={media.popup.open}
      aria-controls={media.popup.id}
      aria-disabled={media.disabled}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          media.popup.toggle();
        }
      }}
      onClick={media.popup.toggle}
    >
      <Flex
          align={['center', 'center', 'center']}
          justify={['center', 'center', 'center']}
          gap={[12, 12, 12]}
          grow={[1, 1, 1]}
          minW={[0, 0, 0]}
          className={styles.TriggerContent}
      >
        <Flex
            align={['center', 'center', 'center']}
            justify={['center', 'center', 'center']}
            w={[32, 32, 32]}
            minW={[32, 32, 32]}
            maxW={[32, 32, 32]}
            h={[32, 32, 32]}
            minH={[32, 32, 32]}
            maxH={[32, 32, 32]}
            bg={['var(--background)', 'var(--background)', 'var(--background)']}
            border={['calc(var(--rpx) * 1) solid var(--line)', 'calc(var(--rpx) * 1) solid var(--line)', 'calc(var(--rpx) * 1) solid var(--line)']}
            r={[8, 8, 8]}
            className={styles.TriggerIconRoot}
        >
          <Icon
              name={media.type.selected.icon}
              w={[20, 20, 20]}
              h={[20, 20, 20]}
              className={styles.TriggerIcon}
          />
        </Flex>
        <Text variant={['caption', 'caption', 'caption']} className={styles.TriggerLabel}>
          {media.selection.item?.label ?? 'Добавить медиа'}
        </Text>
      </Flex>
      <Flex
          dir={['row', 'row', 'row']}
          align={['center', 'center', 'center']}
          justify={['center', 'center', 'center']}
          gap={[8, 8, 8]}
          className={styles.TriggerActions}
      >
        {media.selection.canPreview ? (
          <button
              type="button"
              className={styles.PreviewButton}
              aria-label={media.selection.playable ? 'Воспроизвести медиа' : 'Предпросмотр медиа'}
              disabled={media.disabled}
              onClick={media.selection.preview}
          >
            {media.selection.playable ? (
              <Icon
                  src={SkipNextOutlineIcon}
                  w={[16, 16, 16]}
                  h={[16, 16, 16]}
                  fill="currentColor"
                  className={styles.PlayIcon}
              />
            ) : (
              <Icon
                  src={assetUrl(eyeIcon)}
                  w={[20, 20, 20]}
                  h={[20, 20, 20]}
                  fill="currentColor"
                  className={styles.PreviewIcon}
              />
            )}
          </button>
        ) : null}
        {media.selection.item ? (
          <button
              type="button"
              className={styles.ClearButton}
              aria-label="Удалить медиа"
              disabled={media.disabled}
              onClick={media.selection.clear}
          >
            <Icon
                src={assetUrl(deleteIcon)}
                w={[20, 20, 20]}
                h={[20, 20, 20]}
                stroke="currentColor"
                className={styles.ClearIcon}
            />
          </button>
        ) : null}
        <Icon
            name="ui/arrows/arrow-2/arrow"
            w={[16, 16, 16]}
            h={[16, 16, 16]}
            className={styles.Arrow}
        />
      </Flex>
    </Flex>
  );
}
