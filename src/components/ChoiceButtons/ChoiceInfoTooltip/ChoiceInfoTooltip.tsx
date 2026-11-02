'use client';

import { Flex } from '../../Flex';
import { Icon } from '../../Icon';
import { Text } from '../../Text';
import { Tooltip } from '../../Tooltip';
import { assetUrl, cx } from '../../../core';
import { resolveSvgAssetSource } from '../../../core/base/svg-asset';
import { useTooltip } from '../../../hooks/useTooltip';
import UpIcon from '../assets/up.svg';
import infoIcon from '../../../../assets/icons/ui/info/style-1/info.svg';
import styles from './ChoiceInfoTooltip.module.scss';

const tooltipArrowIconSrc = resolveSvgAssetSource(UpIcon);

type ChoiceInfoTooltipProps = {
    id: string;
    description: string;
    infoClassName: string;
    tooltipClassName: string;
};

export function ChoiceInfoTooltip({
    id,
    description,
    infoClassName,
    tooltipClassName,
}: ChoiceInfoTooltipProps) {
    const tooltip = useTooltip<HTMLElement, HTMLDivElement>({
        direction: 'bottom',
        align: 'center',
        gap: 8,
    });

    return (
        <Flex
            ref={tooltip.anchorRef}
            dir={['row', null, null]}
            align={['center', null, null]}
            justify={['center', null, null]}
            onMouseEnter={tooltip.show}
            onMouseLeave={tooltip.hide}
            className={cx('ChoiceInfoTooltip', styles.ChoiceInfoTooltip)}
        >
            <Icon
                src={assetUrl(infoIcon)}
                w={[20, null, null]}
                h={[20, null, null]}
                strokeWidth={[1.25, null, null]}
                aria-hidden='true'
                className={cx(styles.info, infoClassName)}
            />

            <Tooltip
                ref={tooltip.tooltipRef}
                id={id}
                surface={false}
                className={cx(styles.tooltip, tooltipClassName)}
                {...tooltip.bubbleProps}
            >
                <Flex
                    p={[16, null, null]}
                    r={[16, null, null]}
                    bg={['var(--white-100)', 'var(--white-100)', 'var(--white-100)']}
                    maxW={[400, null, null]}
                    minW={[264, null, null]}
                    border={['calc(1 * var(--rpx)) solid var(--line)', null, null]}
                    className={styles.card}
                >
                    <Text variant={['caption', null, null]}>{description}</Text>
                </Flex>

                <Icon
                    src={tooltipArrowIconSrc}
                    w={[24, null, null]}
                    h={[24, null, null]}
                    aria-hidden='true'
                    className={styles.tail}
                />
            </Tooltip>
        </Flex>
    );
}
