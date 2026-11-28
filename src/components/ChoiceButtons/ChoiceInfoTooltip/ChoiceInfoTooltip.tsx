'use client';

import { Flex } from '../../Flex';
import { Icon } from '../../Icon';
import { Text } from '../../Text';
import { cx } from '#core';
import { resolveSvgAssetSource } from '../../../core/base/svg-asset';
import UpIcon from '../assets/up.svg';
import styles from './ChoiceInfoTooltip.module.scss';

const tooltipArrowIconSrc = resolveSvgAssetSource(UpIcon);

type ChoiceInfoTooltipProps = {
    description: string;
    className?: string;
};

export function ChoiceInfoTooltip({
    description,
    className,
}: ChoiceInfoTooltipProps) {
    return (
        <span className={cx(styles.ChoiceInfoTooltip, className)}>
            <Flex
                as="span"
                p={[16, null, null]}
                r={[16, null, null]}
                bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
                maxW={[400, null, null]}
                minW={[264, null, null]}
                border={['calc(1 * var(--rpx)) solid var(--line)', null, null]}
                className={styles.card}
            >
                <Text as="span" variant={['caption', null, null]}>{description}</Text>
            </Flex>
            <Icon
                src={tooltipArrowIconSrc}
                w={[24, null, null]}
                h={[24, null, null]}
                aria-hidden="true"
                className={styles.tail}
            />
        </span>
    );
}
