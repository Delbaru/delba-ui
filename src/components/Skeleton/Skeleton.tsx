'use client';

import { Flex } from '../Flex';
import { useSkeleton } from './Skeleton.model';
import type { SkeletonProps } from './Skeleton.types';
export type { SkeletonProps } from './Skeleton.types';

export function Skeleton(props: SkeletonProps) {
    const skeleton = useSkeleton(props);
    return (
        <Flex {...skeleton.root}>
            {skeleton.stripes.map((stripe, index) => <Flex key={index} {...stripe} />)}
        </Flex>
    );
}
