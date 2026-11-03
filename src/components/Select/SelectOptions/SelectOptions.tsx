'use client';
import { assetUrl, stateProps } from '../../../core';
import { Flex } from '../../Flex';
import { Box } from '../../Box';
import { Text } from '../../Text';
import { Icon } from '../../Icon';
import type { SelectController } from '../useSelect';
import { selectContent } from '../Select.content';
import checkIcon from '../../../../assets/icons/ui/check/succsess_check_black.svg';
import styles from './SelectOptions.module.scss';
export function SelectOptions<T extends string>({
  select,
  multiple,
}: {
  select: SelectController<T>;
  multiple?: boolean;
}) {
  return (
    <Flex
      ref={select.popup.ref}
      dir={['column', 'column', 'column']}
      id={select.popup.id}
      role="listbox"
      scrollFade
      className={styles.SelectOptions}
      data-scrolls={select.popup.scrolls || undefined}
      aria-hidden={!select.popup.open}
      aria-multiselectable={multiple || undefined}
      aria-activedescendant={
        select.popup.open && select.focus.index >= 0 && select.popup.options[select.focus.index]
          ? `${select.id}-option-${select.focus.index}`
          : undefined
      }
      data-smooth-scroll-ignore
      onWheelCapture={select.popup.events.onWheelCapture}
      onTouchMoveCapture={select.popup.events.onTouchMoveCapture}
    >
      {select.popup.items.map((item) => {
        if (item.type === 'group') {
          return (
            <Text
                key={item.key}
                as="div"
                variant={['caption', 'caption', 'caption']}
                className={styles.GroupLabel}
                color="var(--text-muted)"
            >
              {item.label}
            </Text>
          );
        }

        const opt = item.option;
        const optionIndex = select.focus.indexOf(opt);
        const isSelected = select.value.isSelected(opt);
        const isFocused = optionIndex === select.focus.index;
        const optionContent = opt.children ?? opt.label;

        return (
          // Короткий зазор оставляет больше места переносимой подписи.
          <Flex
              key={item.key}
              ref={select.focus.ref(optionIndex)}
              align={['center', 'center', 'center']}
              justify={['space_between', 'space_between', 'space_between']}
              gap={[8, 8, 8]}
              id={`${select.id}-option-${optionIndex}`}
              role="option"
              aria-label={opt.label}
              aria-selected={isSelected}
              className={styles.Option}
              {...stateProps(isSelected && 'selected', isFocused && 'focused')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select.value.select(opt)}
              onMouseEnter={() => select.focus.set(optionIndex)}
          >
            {/* Строка — сам option; галочка только помечает его состояние. */}
            {multiple && (
              <Flex
                  aria-hidden
                  className={styles.OptionCheck}
                  align={['center', 'center', 'center']}
                  justify={['center', 'center', 'center']}
                  w={[24, 24, 24]}
                  h={[24, 24, 24]}
                  r={[8, 8, 8]}
              >
                <Icon
                    aria-hidden
                    src={assetUrl(checkIcon)}
                    fill="var(--white-100)"
                    w={[16, 16, 16]}
                    h={[16, 16, 16]}
                    className={styles.OptionCheckIcon}
                />
              </Flex>
            )}

            <Box className={styles.OptionContent}>
              {selectContent.render(optionContent, styles.OptionLabel)}
            </Box>
          </Flex>
        );
      })}
    </Flex>
  );
}
