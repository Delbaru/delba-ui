import assert from 'node:assert/strict';
import test from 'node:test';

import { createBrowserUrl, createUrl } from './url';

test('server route helpers stay independent and distinguish page from section', () => {
  const first = createUrl('/programs/one/');
  const second = createUrl('/about');
  assert.equal(first.current(), '/programs/one');
  assert.equal(second.current(), '/about');
  assert.equal(first.isActive('/programs'), true);
  assert.equal(first.isCurrent('/programs'), false);
  assert.equal(first.isActive('/programs#section'), false);
  assert.equal(first.isActive('//another.example/programs'), false);
});

test('browser service reads the live location after navigation rather than caching the first path', () => {
  const browser = { location: new URL('https://example.test/programs?region=one#help') };
  const service = createBrowserUrl(browser as unknown as Window);
  assert.equal(service.current(), '/programs');
  assert.equal(service.query('region'), 'one');
  assert.equal(service.hash(), '#help');
  browser.location = new URL('https://example.test/about');
  assert.equal(service.current(), '/about');
  assert.equal(service.query('region'), null);
  assert.equal(service.isCurrent('/about/'), true);
});

test('URL: exact pages, descendant sections and route boundaries', () => {
    const url = createUrl('/news/article/');
    assert.equal(url.isCurrent('/news/article?preview=1'), true);
    assert.equal(url.isCurrent('/news'), false);
    assert.equal(url.isActive('/news'), true);
    assert.equal(url.isActive('/new'), false);
    assert.equal(url.isActive('/'), false);
    assert.equal(url.anyActive([{ href: '/help' }, { href: '/news' }]), true);
    assert.deepEqual(url.props('/news'), { state: 'current', 'aria-current': undefined });
    assert.deepEqual(url.props('/news/article'), { state: 'current', 'aria-current': 'page' });
});

test('URL: external actions and fragments do not become current pages', () => {
    const url = createUrl('/');
    assert.equal(url.isCurrent('/'), true);
    for (const href of ['/#contacts', '#contacts', '//example.org/', 'https://example.org/', 'mailto:hello@example.org']) {
        assert.equal(url.isCurrent(href), false);
        assert.equal(url.isActive(href), false);
    }
});
