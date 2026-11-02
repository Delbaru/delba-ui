export interface ChoiceButtonsItem<T extends string = string> {
    value: T;
    label: string;
    description?: string;
    onSelect?: (value: T) => void;
}

export interface ChoiceButtonsProps<T extends string = string> {
    /** Варианты; `as const` сужает `T` до литералов значений. */
    items: readonly ChoiceButtonsItem<T>[];
    /** Имя выбранного значения в FormData. */
    name?: string;
    /** ID формы для выбора, расположенного вне её DOM-поддерева. */
    form?: string;
    /** Выбранное значение. `NoInfer`: `T` выводится только из items, значение мимо вариантов — ошибка типов. */
    value?: NoInfer<T> | null;
    /** Начальный выбор неуправляемого режима; проверяется по items так же, как `value`. */
    defaultValue?: NoInfer<T> | null;
    /** Отключает выбор и исключает значение из FormData. */
    disabled?: boolean;
    /** Обозначает обязательный выбор для доступности и проверки состояния внутри Select. */
    required?: boolean;
    /** Зовётся только с выбранным пунктом — значение здесь всегда есть. */
    onChange?: (value: T, item: ChoiceButtonsItem<T>) => void;
    className?: string;
    itemClassName?: string;
    buttonClassName?: string;
    textClassName?: string;
    infoClassName?: string;
    tooltipClassName?: string;
}
