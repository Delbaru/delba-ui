import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TooltipScope, usePopup } from '../../../src/core/Popup/Popup';

function Probe({ scoped = true }: { scoped?: boolean }) {
    const popup = usePopup({ preset: 'tooltip', text: 'Save', scoped });
    return <span data-popup={Boolean(popup.popup)} />;
}

test('scope gates opt-in tooltip labels during SSR', () => {
    assert.match(renderToStaticMarkup(<Probe />), /data-popup="false"/);
    assert.match(
        renderToStaticMarkup(
            <TooltipScope>
                <Probe />
            </TooltipScope>,
        ),
        /data-popup="true"/,
    );
    assert.match(renderToStaticMarkup(<Probe scoped={false} />), /data-popup="true"/);
});

test('a disabled nested scope overrides its enabled parent', () => {
    const markup = renderToStaticMarkup(
        <TooltipScope>
            <TooltipScope enabled={false}>
                <Probe />
            </TooltipScope>
        </TooltipScope>,
    );
    assert.match(markup, /data-popup="false"/);
});
