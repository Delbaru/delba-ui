import { Button } from '../../../Button';
import { Icon } from '../../../Icon';
import { Text } from '../../../Text';
import { preserveFocus } from '../../../../core';
import styles from './LexicalTextareaToolbarButton.module.scss';

export function LexicalTextareaToolbarButton({
  iconSrc,
  isActive,
  onClick,
  ariaLabel,
  size = 20,
}: {
  iconSrc: string;
  isActive?: boolean;
  onClick: () => void;
  ariaLabel: string;
  size?: 20 | 24;
}) {
  return (
    <Button
      type='button'
      className={styles.LexicalTextareaToolbarButton}
      state={isActive ? 'active' : undefined}
      p={[0, 0, 0]}
      w={[size, size, size]}
      h={[size, size, size]}
      bg={['transparent', 'transparent', 'transparent']}
      justifyContent={['center', 'center', 'center']}
      alignItems={['center', 'center', 'center']}
      tooltip={
        <Text
            variant={['micro', null, null]}
            bg={['color-mix(in srgb, var(--black) 80%, transparent)', 'color-mix(in srgb, var(--black) 80%, transparent)', 'color-mix(in srgb, var(--black) 80%, transparent)']}
            color='var(--white-100)'
            p={[4, 8, 4, 8]}
            r={[8, null, null]}
        >{ariaLabel}</Text>
      }
      tooltipDirection='bottom'
      onMouseDown={preserveFocus}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      <Icon src={iconSrc} w={[size, size, size]} h={[size, size, size]} />
    </Button>
  );
}
