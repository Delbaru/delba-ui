import { useEffect, useState } from 'react';
import { NativeCarousel, CarouselProgress, CarouselTimer, synchronizeCarousels, useCarouselController, useCarouselSnapshot,
    type NativeCarouselController } from '../../src/components/NativeCarousel';
import { Button } from '../../src/components/Button';
import { Flex } from '../../src/components/Flex';
import { motion } from '../../src/core/base/transition';

declare global {
    interface Window {
        __advancedCarousels?: { loop: NativeCarouselController; vertical: NativeCarouselController;
            main: NativeCarouselController; strip: NativeCarouselController };
        __toggleAdvancedPartners?: () => void;
        __advancedContentRenders?: number;
        __advancedMotion?: typeof motion;
    }
}

function Slides({ prefix, count }: { prefix: string; count: number }) {
    window.__advancedContentRenders = (window.__advancedContentRenders ?? 0) + 1;
    return Array.from({ length: count }, (_, index) => <Flex key={index} data-source-slide={`${prefix}-${index}`}
        dir={['column', 'column', 'column']} h={['100%', '100%', '100%']} p={[24, 24, 24]}>
        <h2>{prefix} {index + 1}</h2><p>Drag {prefix} content {index + 1}</p>
        {prefix === 'Loop' && index === 0 && <><input aria-label="Unique loop input" defaultValue="Preserve me" />
            <video data-testid="loop-video" muted playsInline /></>}
    </Flex>);
}

export function NativeCarouselAdvancedFixture() {
    const loop = useCarouselController();
    const vertical = useCarouselController();
    const main = useCarouselController();
    const strip = useCarouselController();
    const loopState = useCarouselSnapshot(loop);
    const verticalState = useCarouselSnapshot(vertical);
    const mainState = useCarouselSnapshot(main);
    const stripState = useCarouselSnapshot(strip);
    const [partnersMounted, setPartnersMounted] = useState(true);
    useEffect(() => {
        window.__advancedCarousels = { loop, vertical, main, strip };
        window.__advancedMotion = motion;
        window.__toggleAdvancedPartners = () => setPartnersMounted(value => !value);
        return () => { delete window.__advancedCarousels; delete window.__toggleAdvancedPartners; delete window.__advancedMotion; };
    }, [loop, vertical, main, strip]);
    useEffect(() => synchronizeCarousels([main, strip]), [main, strip, partnersMounted]);
    return <main className="fixture">
        <h1>Advanced native carousel</h1>
        <Button onClick={() => loop.next()}>Loop next</Button>
        <Button onClick={() => loop.prev()}>Loop previous</Button>
        <Button onClick={() => loop.play()}>Loop play</Button>
        <Button onClick={() => loop.pause()}>Loop pause</Button>
        <Button onClick={() => loop.stop()}>Loop stop</Button>
        <output data-testid="advanced-loop-state">{JSON.stringify(loopState)}</output>
        <NativeCarousel label="Advanced loop" controller={loop} loop speed={0.4} autoplayDelay={1.5}
            w={[600, 320, 600]} h={[240, 240, 240]} slidesPerView={[2, 2, 2]} gap={[16, 16, 16]}>
            {Slides({ prefix: 'Loop', count: 6 })}
        </NativeCarousel>
        <CarouselProgress controller={loop} data-testid="advanced-progress" aria-label="Loop autoplay progress"
            w={[600, 320, 600]} h={[8, 8, 8]} fill="currentColor" />
        <CarouselTimer controller={loop} data-testid="advanced-timer" format={state => `${Math.round(state.progress * 100)}% / ${state.remaining.toFixed(2)}s`} />
        <output data-testid="advanced-vertical-state">{JSON.stringify(verticalState)}</output>
        <NativeCarousel label="Advanced vertical" controller={vertical} orientation={['vertical', 'vertical', 'vertical']} mousewheel
            speed={0.2} w={[360, 320, 360]} h={[420, 420, 420]} slidesPerView={[1, 1, 1]} gap={[12, 12, 12]}>
            {Slides({ prefix: 'Vertical', count: 4 })}
        </NativeCarousel>
        <output data-testid="advanced-main-state">{JSON.stringify(mainState)}</output>
        <output data-testid="advanced-strip-state">{JSON.stringify(stripState)}</output>
        {partnersMounted && <>
            <NativeCarousel label="Synchronized main" controller={main} speed={0} w={[600, 320, 600]} h={[180, 180, 180]}
                slidesPerView={[1, 1, 1]} gap={[16, 16, 16]}>{Slides({ prefix: 'Main', count: 6 })}</NativeCarousel>
            <NativeCarousel label="Synchronized strip" controller={strip} speed={0} w={[600, 320, 600]} h={[140, 140, 140]}
                slidesPerView={[3, 3, 3]} gap={[16, 16, 16]}>{Slides({ prefix: 'Strip', count: 6 })}</NativeCarousel>
        </>}
        <div data-testid="advanced-outside" style={{ height: 1500 }}>Scrollable document outside carousel</div>
    </main>;
}
