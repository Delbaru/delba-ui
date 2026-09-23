import assert from 'node:assert/strict';
import test from 'node:test';

import { preloadIcon, registerInlineIcons } from './useFetchedSvg';

const SVG = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M0 0"/></svg>';

function stubFetch(): { calls: string[]; restore: () => void } {
    const calls: string[] = [];
    const g = globalThis as Record<string, unknown>;
    const prev = { window: g.window, fetch: g.fetch };
    g.window = {};
    g.fetch = (url: string) => {
        calls.push(url);
        return Promise.resolve(new Response(SVG));
    };
    return {
        calls,
        restore: () => {
            g.window = prev.window;
            g.fetch = prev.fetch;
        },
    };
}

test('preloadIcon на сервере (нет window) не зовёт fetch и не падает', () => {
    const g = globalThis as Record<string, unknown>;
    const prev = g.fetch;
    let called = 0;
    g.fetch = () => { called += 1; return Promise.reject(new Error('no')); };
    try {
        preloadIcon('/icons/server.svg');
        preloadIcon(null);
        preloadIcon(undefined);
    } finally {
        g.fetch = prev;
    }
    assert.equal(called, 0);
});

test('preloadIcon греет оба ключа одним запросом на ключ и не повторяет запрос', async () => {
    const stub = stubFetch();
    try {
        preloadIcon('/icons/warm.svg');
        preloadIcon('/icons/warm.svg');
        assert.deepEqual(stub.calls, ['/icons/warm.svg', '/icons/warm.svg']);
        await new Promise((resolve) => setTimeout(resolve, 0));
        preloadIcon('/icons/warm.svg');
        assert.equal(stub.calls.length, 2);
    } finally {
        stub.restore();
    }
});

test('preloadIcon не грузит инлайн-иконку и глотает ошибку сети', async () => {
    const stub = stubFetch();
    const g = globalThis as Record<string, unknown>;
    try {
        registerInlineIcons({ '/icons/inline.svg': SVG });
        preloadIcon('/icons/inline.svg');
        assert.equal(stub.calls.length, 0);
        g.fetch = () => Promise.resolve(new Response('', { status: 404 }));
        preloadIcon('/icons/missing.svg');
        await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
        stub.restore();
    }
});
