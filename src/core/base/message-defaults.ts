export interface UiMessages {
    readonly video: {
        readonly play: string;
        readonly pause: string;
        readonly mute: string;
        readonly unmute: string;
        readonly fullscreen: string;
        readonly exitFullscreen: string;
        readonly seek: string;
        readonly volume: string;
        readonly rate: string;
        readonly time: string;
        readonly open: string;
    };
    readonly carousel: {
        readonly previous: string;
        readonly next: string;
        readonly slide: string;
        readonly position: string;
        readonly goTo: string;
    };
    readonly textarea: {
        readonly minLength: string;
        readonly maxLength: string;
    };
    readonly select: {
        readonly placeholder: string;
        readonly required: string;
        readonly selectedCount: string;
    };
    readonly richTextarea: {
        readonly required: string;
        readonly minLength: string;
        readonly maxLength: string;
        readonly bold: string;
        readonly italic: string;
        readonly underline: string;
        readonly bulletList: string;
        readonly numberedList: string;
        readonly link: string;
        readonly linkPrompt: string;
        readonly linkLabelPrompt: string;
        readonly invalidLink: string;
        readonly variableHint: string;
    };
    readonly validation: {
        readonly required: string;
        readonly email: string;
        readonly time: string;
        readonly date: string;
        readonly dateMin: string;
        readonly dateMax: string;
        readonly timeMin: string;
        readonly timeMax: string;
        readonly phoneIncomplete: string;
        readonly phoneDigitsOne: string;
        readonly phoneDigitsFew: string;
        readonly phoneDigitsMany: string;
    };
    readonly input: {
        readonly showPassword: string;
        readonly hidePassword: string;
        readonly increase: string;
        readonly decrease: string;
        readonly openCalendar: string;
    };
    readonly calendar: {
        readonly previousMonth: string;
        readonly nextMonth: string;
        readonly chooseMonth: string;
        readonly nextYear: string;
        readonly previousYear: string;
        readonly months: readonly [string, string, string, string, string, string, string, string, string, string, string, string];
        readonly weekdays: readonly [string, string, string, string, string, string, string];
    };
}

/** Configuration overrides sections independently; calendar lists are always complete tuples. */
export type UiMessageOverrides = {
    readonly [Section in keyof UiMessages]?: Partial<UiMessages[Section]>;
};

export const DEFAULT_UI_MESSAGES: UiMessages = {
    video: {"play":"Воспроизвести","pause":"Пауза","mute":"Выключить звук","unmute":"Включить звук","fullscreen":"Полный экран","exitFullscreen":"Выйти из полного экрана","seek":"Перемотка","volume":"Громкость","rate":"Скорость {rate}","time":"{current} из {duration}","open":"Запустить видео"},
    carousel: {"previous":"Предыдущий слайд","next":"Следующий слайд","slide":"{index} из {count}","position":"Позиция {index} из {count}","goTo":"Перейти к слайду {index}"},
    textarea: {"minLength":"Минимум {count} символов","maxLength":"Максимум {count} символов"},
    select: {"placeholder":"Выберите значение","required":"Выберите значение","selectedCount":"Выбрано ({count})"},
    richTextarea: {"required":"Поле обязательно для заполнения","minLength":"Минимум {min} символов","maxLength":"Максимум {max} символов","bold":"Жирный","italic":"Курсив","underline":"Подчеркнутый","bulletList":"Маркированный список","numberedList":"Нумерованный список","link":"Ссылка","linkPrompt":"Укажите ссылку","linkLabelPrompt":"Текст ссылки","invalidLink":"Допустимы только ссылки http, https, mailto или относительные пути.","variableHint":"Введите @ для вставки переменной"},
    validation: {
        required: 'Поле обязательно для заполнения',
        email: 'Неверный формат email',
        time: 'Введите время в формате 00:00',
        date: 'Введите дату в формате ДД.ММ.ГГГГ',
        dateMin: 'Дата не может быть раньше {value}',
        dateMax: 'Дата не может быть позже {value}',
        timeMin: 'Время не может быть раньше {value}',
        timeMax: 'Время не может быть позже {value}',
        phoneIncomplete: 'Введите номер полностью',
        phoneDigitsOne: 'Введите {count} цифру номера',
        phoneDigitsFew: 'Введите {count} цифры номера',
        phoneDigitsMany: 'Введите {count} цифр номера',
    },
    input: {
        showPassword: 'Показать пароль',
        hidePassword: 'Скрыть пароль',
        increase: 'Увеличить значение',
        decrease: 'Уменьшить значение',
        openCalendar: 'Открыть календарь',
    },
    calendar: {
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        chooseMonth: 'Choose month',
        nextYear: 'Next year',
        previousYear: 'Previous year',
        months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
        weekdays: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'],
    },
};

/** Resolves one complete dictionary without changing defaults or introducing a locale lifecycle. */
export function resolveUiMessages(overrides: UiMessageOverrides = {}): UiMessages {
    return {
        video: { ...DEFAULT_UI_MESSAGES.video, ...overrides.video },
        carousel: { ...DEFAULT_UI_MESSAGES.carousel, ...overrides.carousel },
        textarea: { ...DEFAULT_UI_MESSAGES.textarea, ...overrides.textarea },
        select: { ...DEFAULT_UI_MESSAGES.select, ...overrides.select },
        richTextarea: { ...DEFAULT_UI_MESSAGES.richTextarea, ...overrides.richTextarea },
        validation: { ...DEFAULT_UI_MESSAGES.validation, ...overrides.validation },
        input: { ...DEFAULT_UI_MESSAGES.input, ...overrides.input },
        calendar: { ...DEFAULT_UI_MESSAGES.calendar, ...overrides.calendar },
    };
}

/** Substitutes configured message parameters as plain text; it never creates markup. */
export function formatUiMessage(template: string, values: Readonly<Record<string, string | number>>): string {
    return template.replace(/\{([a-zA-Z]+)\}/g, (placeholder: string, name: string) => {
        if (!Object.prototype.hasOwnProperty.call(values, name)) return placeholder;
        return String(values[name]);
    });
}
