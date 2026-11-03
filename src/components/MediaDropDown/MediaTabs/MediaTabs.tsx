'use client';

import { cx } from '../../../core';
import { Flex } from '../../Flex';
import { Grid } from '../../Grid';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import type { MediaDropDownModel } from '../MediaDropDown.model';
import styles from './MediaTabs.module.scss';
import { Button } from '../../Button';

export function MediaTabs({ media }: { media: Pick<MediaDropDownModel, 'type' | 'file' | 'link' | 'disabled'> }) {
  return (
    <Flex dir={['column', 'column', 'column']} gap={[8, 8, 8]} className={styles.MediaTabs}>
      <Grid
          columns={[2, 2, 2]}
          gap={[4, 4, 4]}
          w={['100%', '100%', '100%']}
          className={styles.TypeGrid}
      >
        {media.type.options.map((option) => {
          const isActive = media.type.current === option.type;
          return (
            <Button
                key={option.type}
                type="button"
                alignItems={['center', 'center', 'center']}
                justifyContent={['center', 'center', 'center']}
                gap={[6, 6, 6]}
                disabled={media.disabled}
                aria-pressed={isActive}
                className={cx(styles.TypeButton, isActive && styles.TypeButtonActive)}
                onClick={() => media.type.choose(option.type)}
            >
              <Icon
                  name={option.icon}
                  w={[16, 16, 16]}
                  h={[16, 16, 16]}
                  className={styles.TypeIcon}
              />
              <Text variant={['micro', 'micro', 'micro']} className={styles.TypeLabel}>
                {option.label}
              </Text>
            </Button>
          );
        })}
      </Grid>

      <Flex
          dir={['column', 'column', 'column']}
          gap={[12, 12, 12]}
          className={styles.UploadSection}
      >
        <button
            type="button"
            className={styles.FileButton}
            disabled={media.disabled}
            onClick={media.file.open}
        >
          <Icon
              name="ui/upload/style-2/upload"
              w={[16, 16, 16]}
              h={[16, 16, 16]}
              className={styles.UploadIcon}
          />
          <Text variant={['micro', 'micro', 'micro']} className={styles.UploadLabel}>
            Выбрать файл
          </Text>
        </button>

        <Flex
            align={['center', 'center', 'center']}
            justify={['center', 'center', 'center']}
            gap={[8, 8, 8]}
            className={styles.Divider}
        >
          <span className={styles.DividerLine} />
          <Text variant={['micro', 'micro', 'micro']} className={styles.DividerText}>
            или
          </Text>
          <span className={styles.DividerLine} />
        </Flex>


          <input
              type="text"
              value={media.link.value}
              onChange={media.link.change}
              onKeyDown={media.link.keyDown}
              disabled={media.disabled}
              placeholder="Вставьте ссылку"
              className={styles.LinkInput}
          />

        <Text variant={['micro', 'micro', 'micro']} className={styles.LinkHint}>
          {media.type.selected.hint}
        </Text>
      </Flex>
    </Flex>
  );
}
