import type React from 'react';
import type { CSSProperties } from 'react';

import type {
    BoxLayoutProps,
    ComponentStateValue,
    FieldValueChangeHandler,
    ResponsiveValue,
    StateLinkInput,
} from '../../core';
import type { TextRole, TextVariantName } from '../../core/base/typography';
import type { SharedMotionProps } from '../../hooks/useSharedMotion';
import type { CollapseOptions } from '../Collapse/CollapseWrap';
import type { PhoneFormat } from './lib/phone-mask';

type VariantKey = 'primary' | 'secondary';
type SizeKey = 'default' | 'fullWidth';
type FontKey = TextVariantName | TextRole;

export interface InputProps
    extends Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        'color' | 'placeholder' | 'size' | 'width' | 'minWidth' | 'maxWidth' | 'height' | 'minHeight' | 'maxHeight'
    >,
    BoxLayoutProps,
    SharedMotionProps {
    style?: CSSProperties;
    /** Настоящее событие ввода; target.value содержит текст нативного поля, до форматирования. */
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    /** Значение модели после маски, seed, шага числа или выбора даты. */
    onValueChange?: FieldValueChangeHandler<HTMLInputElement>;

    variant?: ResponsiveValue<VariantKey>;
    size?: ResponsiveValue<SizeKey>;
    /** Типографика поля (--font-*). Не задан → роль `body`. */
    font?: FontKey;

    color?: string;

    placeholder?: string;
    placeholderColor?: string;
    /**
     * Значение по умолчанию, которое ведёт себя как подсказка: пока в поле стоит `seed`, оно
     * рисуется цветом подсказки и исчезает по фокусу, после чего уход из пустого поля возвращает
     * `seed` назад.
     *
     * Нужен там, где модель уже держит значение по умолчанию (`value ?? '0'` у «Штрафа», `1` у
     * баллов): засеянное значение иначе неотличимо от ответа человека — в поле с «0» ввод «1»
     * даёт «01». Модель при этом не меняется, и после blur получает валидное значение.
     * Проп `placeholderColor` тут ни при чём: подсказка всегда рисуется токеном
     * `--field-placeholder-color`.
     */
    seed?: string;
    label?: string;
    labelColor?: string;
    comment?: string;
    showNumberControls?: boolean;
    numberOptions?: number[];
    /**
     * Показать в поле пароля кнопку-глаз, открывающую набранное. ОПТ-ИН, а не поведение по
     * умолчанию у `type='password'`: формы приложения живут без неё, и включить её всем разом
     * значило бы поменять вид чужих экранов заодно с этим. Просят её там, где пароль ПРИДУМЫВАЮТ
     * (регистрация, сброс) — там опечатку иначе не поймать, потому и нарисована она в макете входа.
     */
    revealable?: boolean;
    /**
     * Значение ещё грузится — вместо него бежит скелетон.
     *
     * ОДИН проп на всю механику ожидания: рамка, высота, паддинг и подпись поля остаются на
     * месте, меняется только содержимое ячейки. Ветки «показывать ли поле» на call-site
     * поэтому не нужно — а именно она и расползалась бы по экранам копиями.
     */
    loading?: boolean;

    length?: { min?: number; max?: number };
    /**
     * Формат номера у `type='tel'`: код страны, длина, группы и образец для подсказки.
     *
     * Нужен там, где рядом с полем стоит выбор страны: без него поле обещает «+7» и десять цифр
     * какой бы флаг ни выбрали. Не задан — российский формат, как было.
     */
    phone?: PhoneFormat;
    /** Содержимое по краям строки поля; ref и события остаются у самого input. */
    slots?: { start?: React.ReactNode; end?: React.ReactNode };
    type?: React.HTMLInputTypeAttribute;

    error?: string;

    /** Сворачивать поле целиком, включая подпись, ошибку и комментарий. */
    collapse?: CollapseOptions;

    state?: ComponentStateValue;

    // Класс на РЯД поля (.input) — тот элемент, который реально красится (фон/рамка/радиус).
    // Нужен пресетам-обёрткам (SharedInput), чтобы вешать классы-оси из _axes.scss: обычный
    // className уезжает на wrapper, а он включает label/comment и красить его нельзя.
    rowClassName?: string;
    /** Оформление нативного input; className/style корня по-прежнему относятся ко всему полю. */
    field?: { className?: string; style?: CSSProperties };
    /** Сохранить нативный required для форм с браузерной валидацией. По умолчанию обязательность проверяет кит. */
    nativeValidation?: boolean;

    required?: boolean;
    emptyMessage?: string;
    validate?: (value: string) => string | undefined;
    /**
     * Где рисовать ошибку поля.
     *
     * `inside` (по умолчанию) — слоем ПОВЕРХ значения: так набран весь кабинет, там поля стоят
     * плотными рядами и лишняя строка двигала бы таблицу. Значение при этом гаснет, а на фокусе
     * ошибка уходит, чтобы не мешать правке.
     *
     * `below` — строкой ПОД полем, значение остаётся видимым. Опт-ин, а не общий дефолт: это
     * меняет высоту поля, то есть вид каждого экрана, где оно стоит. Просят его там, где человек
     * набирает ДЛИННОЕ значение и должен видеть, что именно он написал: «ошибка закрывает поле
     * ввода, и я не вижу, как я писал» — дословная претензия по форме обратной связи сайта.
     */
    errorPlacement?: 'inside' | 'below';

    linkState?: StateLinkInput;
    'data-point-events'?: string;
}
