import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveMediaTypeFromFile, resolveMediaTypeFromUrl } from './media-type';

const file = (name: string, type = '') => ({ name, type }) as File;

test('resolveMediaTypeFromFile: mime главнее расширения', () => {
    assert.equal(resolveMediaTypeFromFile(file('photo.png', 'image/png')), 'image');
    assert.equal(resolveMediaTypeFromFile(file('clip.mp4', 'video/mp4')), 'video');
    assert.equal(resolveMediaTypeFromFile(file('voice.m4a', 'audio/mp4')), 'audio');
});

test('resolveMediaTypeFromFile: пустой mime берёт расширение', () => {
    // Именно этот случай и ловит перетаскивание из архива и часть мобильных диалогов.
    assert.equal(resolveMediaTypeFromFile(file('photo.JPG', '')), 'image');
    assert.equal(resolveMediaTypeFromFile(file('lesson.webm', '')), 'video');
    assert.equal(resolveMediaTypeFromFile(file('voice.ogg', '')), 'audio');
});

test('resolveMediaTypeFromFile: неизвестное — file, а не догадка', () => {
    assert.equal(resolveMediaTypeFromFile(file('otchet.docx', 'application/msword')), 'file');
    assert.equal(resolveMediaTypeFromFile(file('arhiv', '')), 'file');
    // Точка в начале — часть имени, а не расширение.
    assert.equal(resolveMediaTypeFromFile(file('.gitignore', '')), 'file');
});

test('resolveMediaTypeFromUrl: тип снимается с расширения в имени', () => {
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/a/photo.webp'), 'image');
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/a/lesson.mp4'), 'video');
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/a/voice.mp3'), 'audio');
});

test('resolveMediaTypeFromUrl: запрос и хеш — не часть расширения', () => {
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/photo.png?w=100&v=2'), 'image');
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/lesson.mp4#t=10'), 'video');
});

test('resolveMediaTypeFromUrl: без расширения — file, предпросмотр покажет имя', () => {
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/download'), 'file');
    assert.equal(resolveMediaTypeFromUrl('https://cdn.site/'), 'file');
    assert.equal(resolveMediaTypeFromUrl('   '), 'file');
});
