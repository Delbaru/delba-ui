'use client';

import { UI_MESSAGES } from '../../../core/base/messages';

import styles from './CarouselNav.module.scss';

import { useNearestCarouselControls } from '../controls';
import { Flex } from '../../Flex';
import { Button } from '../../Button';
import { Icon } from '../../Icon';
import { assetUrl, cx } from '../../../core';
import arrowIcon from '../../../../assets/icons/ui/arrows/arrow_bold.svg';

export interface CarouselNavProps {
    /** Additional root class. */
    className?: string;
    /** Identifier of the carousel controlled by these arrows. */
    carouselId?: string;
}

export function CarouselNav({ className, carouselId }: CarouselNavProps) {
    const { setRootRef, snapshot } = useNearestCarouselControls(carouselId);
    const shouldRender = snapshot.showNavigation && snapshot.slideCount > 1;
    const prevDisabled = snapshot.navigationState.prevDisabled;
    const nextDisabled = snapshot.navigationState.nextDisabled;

    return (
        <Flex
            ref={setRootRef}
            dir={['row', 'row', null]}
            align={['center', 'center', null]}
            justify={['end', null, null]}
            gap={[8, 4, null]}
            className={cx(styles.CarouselNav, snapshot.navigationClassName, className)}
            data-carousel-navigation
        >
            {shouldRender ? (
                <>
                    <Button
                        type='button'
                        w={[132, 68, null]}
                        h={[80, 36, null]}
                        p={[0, 0, null]}
                        bg={['var(--black-70)', 'var(--black-70)', 'var(--black-70)']}
                        r={[40, 40, null]}
                        onClick={() => snapshot.api?.prev()}
                        disabled={prevDisabled}
                        className={cx(styles.nav, styles.prev)}
                        aria-label={UI_MESSAGES.carousel.previous}
                        data-carousel-nav-button='prev'
                    >
                        <Icon
                            src={assetUrl(arrowIcon)}
                            w={[70, 36, null]}
                            h={[40, 20, null]}
                            aria-hidden
                        />
                    </Button>

                    <Button
                        type='button'
                        w={[132, 68, null]}
                        h={[80, 36, null]}
                        p={[0, 0, null]}
                        bg={['var(--black-70)', 'var(--black-70)', 'var(--black-70)']}
                        r={[40, 40, null]}
                        onClick={() => snapshot.api?.next()}
                        disabled={nextDisabled}
                        className={cx(styles.nav, styles.next)}
                        aria-label={UI_MESSAGES.carousel.next}
                        data-carousel-nav-button='next'
                    >
                        <Icon
                            src={assetUrl(arrowIcon)}
                            w={[70, 36, null]}
                            h={[40, 20, null]}
                            aria-hidden
                        />
                    </Button>
                </>
            ) : null}
        </Flex>
    );
}
