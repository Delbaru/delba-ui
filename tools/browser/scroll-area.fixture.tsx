import { useRef, useState } from 'react';
import { Flex } from '../../src/components/Flex';
import { ScrollArea } from '../../src/components/ScrollArea';

export function ScrollAreaFixture() {
    const viewport = useRef<HTMLDivElement>(null);
    const [events, setEvents] = useState(0);
    return (
        <section>
            <h2>Native scroll area</h2>
            <Flex dir="column" h={[200, 200, 200]} w={[320, 320, 320]}>
                <input aria-label="Pinned scroll search" defaultValue="Search" />
                <ScrollArea
                    ref={viewport}
                    dir="column"
                    fade
                    data-testid="scroll-area"
                    role="region"
                    aria-label="Scrollable choices"
                    tabIndex={0}
                    scrollbar={{ color: 'rgb(120, 120, 120)', inset: 8 }}
                    // Consumer native styles must not re-enable OS arrows in Chromium.
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'red blue' }}
                    onScroll={(event) => {
                        if (event.currentTarget === viewport.current) setEvents((count) => count + 1);
                    }}
                >
                    {Array.from({ length: 30 }, (_, index) => <div key={index} style={{ flexShrink: 0, height: 32 }}>Choice {index + 1}</div>)}
                </ScrollArea>
            </Flex>
            <output data-testid="scroll-area-events">{events}</output>
        </section>
    );
}
