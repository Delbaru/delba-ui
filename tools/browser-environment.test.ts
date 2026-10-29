import assert from 'node:assert/strict';
import test from 'node:test';
import verifyFixtureOwner from './browser/global-setup';
import { browserPort, kitRoot } from './browser/environment';

test('browser gate rejects an unrelated running fixture even when its HTTP response succeeds', async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response(JSON.stringify({ kitRoot: '/another/checkout' }));
        await assert.rejects(verifyFixtureOwner(), /belongs to another checkout/);
        globalThis.fetch = async () => new Response(JSON.stringify({ kitRoot }));
        await verifyFixtureOwner();
        assert.ok(browserPort >= 1024 && browserPort <= 65535);
    } finally {
        globalThis.fetch = original;
    }
});
