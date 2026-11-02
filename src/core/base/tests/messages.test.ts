import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { useFieldControl } from '../../useFieldControl';
import { DEFAULT_UI_MESSAGES, resolveUiMessages } from '../message-defaults';
import { UI_MESSAGES, formatUiMessage } from '../messages';

test('partial message overrides preserve sibling defaults and do not change their source', () => {
    const configured = resolveUiMessages({
        validation: { required: 'Укажите значение' },
        input: { showPassword: 'Открыть пароль' },
    });
    assert.equal(configured.validation.required, 'Укажите значение');
    assert.equal(configured.validation.email, 'Неверный формат email');
    assert.equal(configured.input.showPassword, 'Открыть пароль');
    assert.equal(configured.input.hidePassword, DEFAULT_UI_MESSAGES.input.hidePassword);
    assert.deepEqual(configured.calendar, DEFAULT_UI_MESSAGES.calendar);
    assert.equal(DEFAULT_UI_MESSAGES.validation.required, 'Поле обязательно для заполнения');
});

test('message parameters preserve literal replacement text and do not treat prototype properties as values', () => {
    assert.equal(formatUiMessage(DEFAULT_UI_MESSAGES.validation.dateMin, { value: '01.02.2026' }), 'Дата не может быть раньше 01.02.2026');
    assert.equal(formatUiMessage(DEFAULT_UI_MESSAGES.validation.phoneDigitsMany, { count: 11 }), 'Введите 11 цифр номера');
    assert.equal(formatUiMessage('{value}: {missing} {constructor}', { value: '$& <text>' }), '$& <text>: {missing} {constructor}');
});

test('the real field owner uses configured required text and preserves the per-field override', () => {
    let validate: (value: string) => string | undefined = () => undefined;
    function Probe({ emptyMessage }: { emptyMessage?: string }) {
        const field = useFieldControl<HTMLInputElement>(undefined, { required: true, emptyMessage });
        validate = field.validateValue;
        return null;
    }
    renderToStaticMarkup(createElement(Probe));
    assert.equal(validate(' '), UI_MESSAGES.validation.required);
    assert.equal(validate('value'), undefined);
    renderToStaticMarkup(createElement(Probe, { emptyMessage: 'Заполните это поле' }));
    assert.equal(validate(''), 'Заполните это поле');
});
