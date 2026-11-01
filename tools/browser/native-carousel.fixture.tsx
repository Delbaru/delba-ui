import { useEffect, useRef, useState } from 'react';
import { NativeCarousel, useCarouselController, useCarouselSnapshot, type NativeCarouselController } from '../../src/components/NativeCarousel';
import { CarouselDots } from '../../src/components/Carousel/CarouselDots';
import { Button } from '../../src/components/Button';
import { Flex } from '../../src/components/Flex';
import { Carousel, type CarouselApi } from '../../src/components/Carousel';

declare global {
    interface Window {
        __nativeCarousel?: NativeCarouselController;
        __toggleNativeCarousel?: () => void;
        __legacyCarousel?: CarouselApi | null;
        __legacyActiveIndices?: number[];
        __setNativeCount?: (count: number) => void;
        __setNativeInertia?: (enabled: boolean) => void;
        __setNativeLoop?: (enabled: boolean) => void;
    }
}

export function NativeCarouselFixture() {
    const carousel = useCarouselController();
    const state = useCarouselSnapshot(carousel);
    const [mounted, setMounted] = useState(true);
    const [count, setCount] = useState(4);
    const [inertia, setInertia] = useState(false);
    const [loop, setLoop] = useState(false);
    const video = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        window.__nativeCarousel = carousel;
        window.__toggleNativeCarousel = () => setMounted(value => !value);
        window.__setNativeCount = setCount;
        window.__setNativeInertia = setInertia;
        window.__setNativeLoop = setLoop;
        return () => { delete window.__nativeCarousel; delete window.__toggleNativeCarousel; delete window.__setNativeCount;
            delete window.__setNativeInertia; delete window.__setNativeLoop; };
    }, [carousel]);
    return <main className="fixture">
        <h1>Native carousel contracts</h1>
        <Button onClick={() => carousel.prev()}>Previous native</Button>
        <Button onClick={() => carousel.next()}>Next native</Button>
        <Button onClick={() => carousel.play()}>Play native</Button>
        <Button onClick={() => carousel.pause()}>Pause native</Button>
        <Button onClick={() => carousel.stop()}>Stop native</Button>
        <output data-testid="native-state">{JSON.stringify(state)}</output>
        {mounted && <NativeCarousel label="Native fixture gallery" controller={carousel} carouselId="native-fixture" rewind loop={loop} inertia={inertia} speed={0.3}
            autoplayDelay={0.2} w={[600, 320, 480]} h={[240, 240, 240]} slidesPerView={[2, 1, 1.5]} gap={[16, 12, 16]}
            onKeyDown={event => { if (event.shiftKey) event.preventDefault(); }}
            onPointerDown={event => { if (event.shiftKey) event.preventDefault(); }}>
            {Array.from({ length: count }, (_, index) => <Flex key={index} dir={['column', 'column', 'column']} h={['100%', '100%', '100%']} p={[20, 20, 20]}>
                <h2>Native slide {index + 1}</h2>
                <p>Draggable content {index + 1}</p>
                <input aria-label={`Input ${index + 1}`} defaultValue="Editable content" />
                <a href={`#destination-${index}`}>Native link {index + 1}</a>
                {index === 0 && <video ref={video} data-testid="native-video" muted playsInline />}
            </Flex>)}
        </NativeCarousel>}
        <CarouselDots carouselId="native-fixture" renderItem={({ index, isActive, onSelect }) => <Button
            aria-label={`Native page ${index + 1}`} aria-current={isActive ? 'true' : undefined} onClick={onSelect}>{index + 1}</Button>} />
        <div style={{ height: 1600 }}>Scrollable area below the carousel</div>
        <Carousel carouselId="legacy-index-fixture" w={[600, 320, 480]} h={[120, 120, 120]} slidesPerView={[1, 1, 1]} speed={0}
            apiRef={api => { window.__legacyCarousel = api; }} onActiveIndexChange={index => { window.__legacyActiveIndices ??= []; window.__legacyActiveIndices.push(index); }}>
            {[1, 2, 3, 4].map(index => <p key={index}>Legacy slide {index}</p>)}
        </Carousel>
    </main>;
}
