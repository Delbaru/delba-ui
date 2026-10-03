import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSeedField } from './seed';

test('resolveSeedField: без seed поле обычное — ни подсказки, ни вмешательства в value', () => {
    const plain = resolveSeedField({ value: 'Вася' });

    assert.equal(plain.isHintShown, false, 'подсказки нет');
    assert.equal(plain.displayValue, 'Вася', 'значение показываем как есть');
    assert.equal(plain.focusValue, undefined, 'фокус ничего не отдаёт');
    assert.equal(plain.blurValue, undefined, 'уход из заполненного ничего не отдаёт');

    const empty = resolveSeedField({ seed: '', value: '' });

    assert.equal(empty.isHintShown, false, 'пустой seed — не подсказка');
    assert.equal(empty.blurValue, undefined, 'пустой seed нечего возвращать');
});

test('resolveSeedField: значение по умолчанию рисуется подсказкой, а в поле уходит пустым', () => {
    const field = resolveSeedField({ seed: '0', value: '0', placeholder: 'Вес' });

    assert.equal(field.isHintShown, true, 'в поле стоит значение по умолчанию — это подсказка');
    assert.equal(field.displayValue, '', 'нативному полю отдаём пустоту, рисует ::placeholder');
    assert.equal(field.placeholder, '0', 'подсказка — сам seed, обычный placeholder уступает');
});

test('resolveSeedField: по фокусу поле пустеет — в модель уходит пустая строка', () => {
    const field = resolveSeedField({ seed: '0', value: '0' });

    assert.equal(field.focusValue, '', 'стираем значение по умолчанию, чтобы «01» не вышло');
    assert.equal(
        resolveSeedField({ seed: '0', value: '5' }).focusValue,
        undefined,
        'введённое значение — данные, стирать нечего',
    );
});

test('resolveSeedField: уход из пустого поля возвращает значение по умолчанию', () => {
    assert.equal(
        resolveSeedField({ seed: '0', value: '' }).blurValue,
        '0',
        'пустое поле после blur обязано получить валидное значение',
    );
    assert.equal(
        resolveSeedField({ seed: '0', value: '  ' }).blurValue,
        '0',
        'пробелы — тоже пустое поле',
    );
    assert.equal(
        resolveSeedField({ seed: '0', value: '0' }).blurValue,
        undefined,
        'подсказка уже стоит в модели — возвращать нечего',
    );
    assert.equal(
        resolveSeedField({ seed: '0', value: '5' }).blurValue,
        undefined,
        'человек оставил своё значение',
    );
});

test('resolveSeedField: введённое значение и обычный placeholder не трогаются', () => {
    const field = resolveSeedField({ seed: '0', value: '5', placeholder: 'Введите ответ' });

    assert.equal(field.isHintShown, false);
    assert.equal(field.displayValue, '5', 'набранное показываем как данные');
    assert.equal(field.placeholder, 'Введите ответ', 'настоящая подсказка на месте');
});