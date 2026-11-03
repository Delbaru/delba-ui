'use client';


import { Flex } from '../../Flex';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import type { MediaDropDownModel } from '../MediaDropDown.model';
import styles from './MediaDropzone.module.scss';
import { Button } from '../../Button';
import { Input } from '../../Input';

export function MediaDropzone({ media }: { media: Pick<MediaDropDownModel, 'file' | 'link' | 'drag' | 'labels' | 'disabled'> }) {
  return (
    <Flex
        className={styles.MediaDropzone}
        dir={['column', 'column', 'column']}
        gap={[12, 12, 12]}
        w={['100%', null, null]}
    >
      <Button
          type="button"
          w={['100%', null, null]}
          p={[24, 24, 24]}
          pl={[16, 16, 16]}
          pr={[16, 16, 16]}
          r={[12, 12, 12]}
          bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
          border={['calc(1 * var(--rpx)) dashed var(--line)', null, null]}
          className={styles.DropZone}
          state={media.drag.active ? 'dragging' : undefined}
          disabled={media.disabled}
          onClick={media.file.open}
          onDragEnter={media.drag.enter}
          onDragOver={media.drag.over}
          onDragLeave={media.drag.leave}
          onDrop={media.drag.drop}
      >
        <Flex
            dir={['column', 'column', 'column']}
            align={['center', 'center', 'center']}
            gap={[8, 8, 8]}
        >
          <Icon
              name="ui/upload/style-2/upload"
              w={[20, 20, 20]}
              h={[20, 20, 20]}
              className={styles.DropZoneIcon}
          />

          <Flex align={['center', 'center', 'center']} gap={[8, 8, 8]}>
            <Text variant={['micro', 'micro', 'micro']} color="var(--black)">
              {media.labels.title}
            </Text>
            <Text variant={['micro', 'micro', 'micro']} color="var(--line)" aria-hidden>
              ·
            </Text>
            <Text variant={['micro', 'micro', 'micro']} color="var(--text-muted)">
              {media.labels.hint}
            </Text>
          </Flex>
        </Flex>
      </Button>

      <Flex align={['center', 'center', 'center']} gap={[8, 8, 8]}>
        <Input
            value={media.link.value}
            onChange={media.link.change}
            onKeyDown={media.link.keyDown}
            disabled={media.disabled}
            placeholder={media.link.placeholder}
            aria-label={media.link.placeholder}
            grow={[1, 1, 1]}
            minW={[0, 0, 0]}
            h={[40, 40, 40]}
            r={[12, 12, 12]}
            p={[0, 0, 0]}
            pl={[12, 12, 12]}
            pr={[12, 12, 12]}
            bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
            border={['calc(1 * var(--rpx)) solid var(--line)', null, null]}
        />

        <Button
            type="button"
            variant={['primary', 'primary', 'primary']}
            h={[40, 40, 40]}
            r={[12, 12, 12]}
            p={[0, 0, 0]}
            pl={[16, 16, 16]}
            pr={[16, 16, 16]}
            disabled={media.disabled || !media.link.value.trim()}
            onClick={media.link.submit}
        >
          <Text variant={['micro', 'micro', 'micro']}>{media.link.submitLabel}</Text>
        </Button>
      </Flex>
    </Flex>
  );
}
