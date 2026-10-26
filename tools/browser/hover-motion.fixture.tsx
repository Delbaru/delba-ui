import { useRef, useState } from 'react';

import { Flex } from '../../src/components/Flex';
import { Icon } from '../../src/components/Icon';
import { Img } from '../../src/components/Img';
import { Text } from '../../src/components/Text';

export function HoverMotionFixture() {
    const [mounted, setMounted] = useState(true);
    const [events, setEvents] = useState(0);
    const targetRef = useRef<HTMLSpanElement>(null);
    return (
        <section data-testid="hover-fixture">
            <button onClick={() => setMounted((value) => !value)}>Toggle hover target</button>
            <output data-testid="hover-events">{events}</output>
            <Flex
                motionScope
                data-testid="hover-card"
                style={{ width: 300, height: 200, padding: 16, border: '1px solid' }}
                onMouseEnter={() => setEvents((value) => value + 1)}
            >
                <button data-testid="hover-focus">Focus source</button>
                {mounted && <Img
                    ref={targetRef}
                    data-testid="hover-image"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E"
                    alt=""
                    w={[40, 40, 40]}
                    h={[40, 40, 40]}
                    animate={{ when: 'load', effect: 'up', duration: 0, hover: { effect: 'transform', source: 'closest', from: { scale: 0.9 }, scale: 1.1, duration: 0.08 } }}
                />}
                <Flex
                    motionScope
                    data-testid="hover-inner"
                    style={{ width: 100, height: 80, padding: 8 }}
                >
                    <Icon
                        data-testid="hover-icon"
                        name="ui/arrow/arrow_right"
                        animate={{ when: 'hover', effect: 'transform', source: 'closest', rotate: 45, duration: 0.08 }}
                    />
                </Flex>
            </Flex>
            <Flex data-testid="hover-parent" style={{ width: 200, height: 100 }}>
                <button data-testid="hover-parent-focus">Parent focus</button>
                <Text
                    data-testid="hover-text"
                    animate={{ when: 'hover', effect: 'transform', source: 'parent', x: 4, y: -2, duration: 0.08 }}
                >Shift</Text>
            </Flex>
        </section>
    );
}
