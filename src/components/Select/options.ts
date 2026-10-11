import type React from 'react';

// Данные списка Select без React: плоский список пунктов, сравнение значений, пункт в фокусе.

export interface SelectOption<T extends string = string> {
    value: T;

    /**
     * Текстовое название опции.
     * Используется для aria-label, fallback и простого текстового отображения.
     */
    label: string;

    /**
     * Кастомное содержимое опции в dropdown.
     * Можно передать Text, Icon, Img, Flex и любой другой JSX.
     */
    children?: React.ReactNode;

    /**
     * Кастомное содержимое выбранного значения в trigger.
     * Если не передать, будет использован children, затем label.
     */
    selectedChildren?: React.ReactNode;
}

export interface SelectOptionGroup<T extends string = string> {
    label: string;
    options: readonly SelectOption<T>[];
}

export type SelectItem<T extends string = string> = SelectOption<T> | SelectOptionGroup<T>;

export type FlattenedSelectItem<T extends string = string> =
    | { type: 'group'; label: string; key: string }
    | { type: 'option'; option: SelectOption<T>; key: string };

export function defaultEqual<T>(a: T | null, b: T | null): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

export function isValueArray<T>(v: T | null | T[]): v is T[] {
    return Array.isArray(v);
}

/** Values are emitted as repeated name entries for native FormData multi-select semantics. */
export function selectFormValues<T>(value: T | null | T[], multiple: boolean): string[] {
    if (multiple) {
        return Array.isArray(value) ? value.map(String) : [];
    }

    return value == null || Array.isArray(value) ? [] : [String(value)];
}

function isSelectOptionGroup<T extends string>(item: SelectItem<T>): item is SelectOptionGroup<T> {
    return 'options' in item;
}

export function flattenSelectItems<T extends string>(items: readonly SelectItem<T>[]): FlattenedSelectItem<T>[] {
    return items.flatMap((item, groupIndex) => {
        if (!isSelectOptionGroup(item)) {
            return [{ type: 'option', option: item, key: `option-${String(item.value)}` }];
        }

        return [
            { type: 'group', label: item.label, key: `group-${groupIndex}-${item.label}` },
            ...item.options.map((option) => ({
                type: 'option' as const,
                option,
                key: `group-${groupIndex}-option-${String(option.value)}`,
            })),
        ];
    });
}

/** Пункты раскрытого списка: только видимые опции и только те группы, где такие остались. */
export function visibleDropdownItems<T extends string>(
    flatItems: FlattenedSelectItem<T>[],
    dropdownOptions: SelectOption<T>[],
    showSelected: boolean
): FlattenedSelectItem<T>[] {
    if (showSelected) return flatItems;

    const visibleValues = new Set(dropdownOptions.map((option) => String(option.value)));

    return flatItems.filter((item, index) => {
        if (item.type === 'option') return visibleValues.has(String(item.option.value));

        for (let nextIndex = index + 1; nextIndex < flatItems.length; nextIndex += 1) {
            const nextItem = flatItems[nextIndex];
            if (!nextItem || nextItem.type === 'group') return false;
            if (visibleValues.has(String(nextItem.option.value))) return true;
        }

        return false;
    });
}

export function getFocusedOptionIndex<T extends string>(
    options: SelectOption<T>[],
    multiple: boolean,
    selectedOption: SelectOption<T> | null,
    selectedOptions: SelectOption<T>[]
): number {
    if (options.length === 0) return -1;

    const firstSelected = selectedOptions[0];

    if (multiple && firstSelected) {
        const firstSelectedIndex = options.findIndex((option) => defaultEqual(option.value, firstSelected.value));
        return firstSelectedIndex >= 0 ? firstSelectedIndex : 0;
    }

    if (!multiple && selectedOption) {
        const selectedIndex = options.findIndex((option) => defaultEqual(option.value, selectedOption.value));
        return selectedIndex >= 0 ? selectedIndex : 0;
    }

    return 0;
}
