import { memo, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min';

import { Button } from '../Button';
import { Dropdown } from '../Dropdown';
import { Flex } from '../Flex';
import { Input } from '../Input';
import { Text } from '../Text';
import { filterPhoneCountries, groupPhoneCountries, type PhoneCountryOption } from './countries';
import styles from './PhoneField.module.scss';

interface CountryPickerProps {
    countries: readonly PhoneCountryOption[];
    country: CountryCode;
    disabled?: boolean;
    locale: string;
    onSelect: (country: CountryCode) => void;
}

const RUSSIAN = { country: 'Страна', choose: 'Выберите страну', search: 'Поиск стран', countries: 'Страны', empty: 'Страны не найдены' };
const ENGLISH = { country: 'Country', choose: 'Choose a country', search: 'Search countries', countries: 'Countries', empty: 'No countries found' };

// Поиск и список обновляются независимо от ввода номера в соседнем input.
export const CountryPicker = memo(function CountryPicker({ countries, country, disabled, locale, onSelect }: CountryPickerProps) {
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement | null>(null);
    const focusFrame = useRef<number | null>(null);
    const countryName = countries.find(({ code }) => code === country)?.name ?? country;
    const countryGroups = useMemo(() => groupPhoneCountries(filterPhoneCountries(countries, query)), [countries, query]);
    const words = locale.toLowerCase().startsWith('ru') ? RUSSIAN : ENGLISH;

    useEffect(() => () => {
        if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    }, []);

    function handleTriggerClick(event: MouseEvent<HTMLElement>) {
        if (event.currentTarget.getAttribute('aria-expanded') === 'true') return;
        if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
        focusFrame.current = requestAnimationFrame(() => {
            focusFrame.current = null;
            searchRef.current?.focus();
        });
    }

    function handleCountryChange(nextCountry: CountryCode, close: () => void) {
        onSelect(nextCountry);
        setQuery('');
        close();
    }

    return (
        <Dropdown
            panel={{ portal: true, side: 'start', className: styles.countryPanel, keepMounted: false }}
            trigger={
                <Button
                    type="button"
                    disabled={disabled}
                    onClick={handleTriggerClick}
                    aria-label={`${words.country}: ${countryName} (${country})`}
                    aria-haspopup="dialog"
                    className={styles.countryTrigger}
                >
                    {country} +{getCountryCallingCode(country)}
                </Button>
            }
        >
            {(close) => (
                <Flex
                    dir={['column', 'column', 'column']}
                    w={[320, 320, 320]}
                    maxH={['var(--floating-available)', 'var(--floating-available)', 'var(--floating-available)']}
                    maxW={['calc(100vw - 32 * var(--rpx))', 'calc(100vw - 32 * var(--rpx))', 'calc(100vw - 32 * var(--rpx))']}
                    border={['calc(1 * var(--rpx)) solid var(--line)', 'calc(1 * var(--rpx)) solid var(--line)', 'calc(1 * var(--rpx)) solid var(--line)']}
                    r={[8, 8, 8]}
                    bg={["var(--background)", "var(--background)", "var(--background)"]}
                    className={styles.countryContent}
                    role="dialog"
                    aria-label={words.choose}
                >
                    <Flex
                        p={[8, 8, 8]}
                        borderB={[
                            'calc(1 * var(--rpx)) solid var(--line)',
                            'calc(1 * var(--rpx)) solid var(--line)',
                            'calc(1 * var(--rpx)) solid var(--line)',
                        ]}
                    >
                        <Input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.currentTarget.value)}
                            aria-label={words.search}
                            placeholder={words.search}
                            disabled={disabled}
                            w={['100%', '100%', '100%']}
                        />
                    </Flex>
                    <Flex
                        className={styles.countryResults}
                        dir={['column', 'column', 'column']}
                        maxH={[280, 280, 280]}
                        minH={[0, 0, 0]}
                        role="group"
                        aria-label={words.countries}
                    >
                        {countryGroups.length > 0 ? (
                            countryGroups.map((group, groupIndex) => (
                                <Flex
                                    className={styles.countryGroup}
                                    dir={['column', 'column', 'column']}
                                    borderT={
                                        groupIndex > 0
                                            ? [
                                                  'calc(1 * var(--rpx)) solid var(--line)',
                                                  'calc(1 * var(--rpx)) solid var(--line)',
                                                  'calc(1 * var(--rpx)) solid var(--line)',
                                              ]
                                            : [null, null, null]
                                    }
                                    key={group.callingCode}
                                >
                                    <Text
                                        as="div"
                                        variant={['caption', 'caption', 'caption']}
                                        p={[4, 4, 4]}
                                        pl={[12, 12, 12]}
                                        bg={["var(--background)", "var(--background)", "var(--background)"]}
                                        color="var(--text-muted)"
                                        className={styles.countryGroupLabel}
                                    >
                                        +{group.callingCode}
                                    </Text>
                                    <Flex dir={['column', 'column', 'column']}>
                                        {group.countries.map((option) => (
                                            <Button
                                                key={option.code}
                                                type="button"
                                                variant={['tertiary', 'tertiary', 'tertiary']}
                                                aria-pressed={option.code === country}
                                                w={['100%', '100%', '100%']}
                                                justifyContent={['space_between', 'space_between', 'space_between']}
                                                onClick={() =>
                                                    handleCountryChange(option.code, close)
                                                }
                                            >
                                                <span>
                                                    {option.name} ({option.code})
                                                </span>
                                                <span>+{option.callingCode}</span>
                                            </Button>
                                        ))}
                                    </Flex>
                                </Flex>
                            ))
                        ) : (
                            <Text as="div" variant={['body', 'body', 'body']} p={[12, 12, 12]} color="var(--text-muted)">{words.empty}</Text>
                        )}
                    </Flex>
                </Flex>
            )}
        </Dropdown>
    );
});
