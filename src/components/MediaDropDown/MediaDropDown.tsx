'use client';

import { cx, type WithRef } from '../../core';
import { Flex } from '../Flex';
import { Dropdown } from '../Dropdown';
import { useMediaDropDown } from './MediaDropDown.model';
import { MediaTrigger } from './MediaTrigger/MediaTrigger';
import { MediaDropzone } from './MediaDropzone/MediaDropzone';
import { MediaTabs } from './MediaTabs/MediaTabs';
import type { MediaDropDownProps } from './MediaDropDown.types';
import styles from './MediaDropDown.module.scss';

export type { MediaType } from './lib/media-type';
export type {
  MediaDropDownProps,
  MediaDropDownSelection,
  MediaDropDownSelectionSource,
  MediaDropDownVariant,
} from './MediaDropDown.types';

export function MediaDropDown(props: WithRef<MediaDropDownProps, HTMLDivElement>) {
  const media = useMediaDropDown(props);

  return (
    <Flex
        {...media.root}
        dir={['column', 'column', 'column']}
        w={['100%', '100%', '100%']}
        className={cx('MediaDropDown', styles.MediaDropDown, media.root.className)}
        data-open={media.popup.open}
    >
      <MediaTrigger media={media} />
      <Dropdown
        id={media.popup.id}
        anchorRef={media.popup.anchor}
        open={media.popup.open}
        onOpenChange={media.popup.change}
        keyboard="content"
        closeOn={{ blur: false, escape: false }}
        returnFocus={false}
        panel={{
          portal: false,
          offset: -1,
          matchTriggerWidth: true,
          className: styles.surface,
          bg: ['var(--white-100)', 'var(--white-100)', 'var(--white-100)'],
          r: [16, 16, 16],
          tlr: [0, 0, 0],
          trr: [0, 0, 0],
          p: media.type.dropzone ? [12, 12, 12] : [8, 8, 8],
          pb: media.type.dropzone ? [16, 16, 16] : [24, 24, 24],
          animate: { when: 'open', effect: 'fade', duration: 'fast' },
        }}
      >
        {media.type.dropzone ? <MediaDropzone media={media} /> : <MediaTabs media={media} />}
      </Dropdown>
      <input
          ref={media.file.ref}
          type="file"
          accept={media.file.accept}
          disabled={media.disabled}
          className={styles.HiddenInput}
          onChange={media.file.change}
      />
    </Flex>
  );
}
