import assert from 'node:assert/strict';
import test from 'node:test';

import { createHandles } from './handles';

type TestShape = {
    question: {
        focus: () => Promise<string>;
        label: (suffix: string) => Promise<string>;
    };
    section: {
        reveal: () => Promise<string>;
    };
};

const testHandles: TestShape['question'] = {
    focus: () => Promise.resolve('ok'),
    label: (suffix) => Promise.resolve(`q${suffix}`),
};

test('get: вызов до регистрации исполняется после неё', async () => {
    const handles = createHandles<TestShape>();

    const call = handles.get('question', 'q1').focus();
    let settled = false;
    void call.then(() => {
        settled = true;
    });

    await Promise.resolve();
    assert.equal(settled, false, 'до регистрации вызов ждёт монтирования');

    handles.register('question', 'q1', testHandles);

    assert.equal(await call, 'ok', 'после регистрации исполнен на живой ручке');
});

test('get: глагол передаёт аргументы и возвращает результат ручки', async () => {
    const handles = createHandles<TestShape>();
    handles.register('question', 'q1', testHandles);

    assert.equal(await handles.get('question', 'q1').label('!'), 'q!');
});

test('get: сущности с одним id, но разными именами не смешиваются', async () => {
    const handles = createHandles<TestShape>();
    handles.register('section', 's1', { reveal: () => Promise.resolve('section') });

    let settled = false;
    void handles.get('question', 's1').focus().then(() => {
        settled = true;
    });

    await Promise.resolve();
    assert.equal(settled, false, 'ручка вопроса s1 не зарегистрирована — чужая не подошла');
});

test('register: повторная регистрация заменяет ручку, отписка снимает только свою', async () => {
    const handles = createHandles<TestShape>();
    const unregister = handles.register('question', 'q1', testHandles);
    handles.register('question', 'q1', { focus: () => Promise.resolve('new'), label: (suffix) => Promise.resolve(suffix) });

    unregister();

    assert.equal(await handles.get('question', 'q1').focus(), 'new', 'чужая отписка замену не сняла');
});

test('register: отписка снимает ручку — новый вызов снова ждёт', async () => {
    const handles = createHandles<TestShape>();
    const unregister = handles.register('question', 'q1', testHandles);
    unregister();

    const call = handles.get('question', 'q1').focus();
    let settled = false;
    void call.then(() => {
        settled = true;
    });

    await Promise.resolve();
    assert.equal(settled, false, 'после отписки живой ручки нет');

    handles.register('question', 'q1', { focus: () => Promise.resolve('again'), label: (suffix) => Promise.resolve(suffix) });

    assert.equal(await call, 'again', 'дождавшийся вызов исполнен на новой ручке');
});
