'use client';

import styles from './MediaDropDown.module.scss';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { assetUrl, cx, stateProps, type WithRef, useMergedRefs } from '../../core';
import { resolveSvgAssetSource } from '../../core/base/svg-asset';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';
import { resolveMediaTypeFromFile, resolveMediaTypeFromUrl, type MediaType } from './lib/media-type';
import { Button } from '../Button';
import { Flex } from '../Flex';
import { Text } from '../Text';
import { Icon } from '../Icon';
import { Input } from '../Input';
import SkipNextOutlineIconAsset from '../RichTextarea/assets/skip-next-outline.svg';

import eyeIcon from '../../../assets/icons/ui/eye/style-1/eye.svg';
import deleteIcon from '../../../assets/icons/ui/delete/style-1/delete.svg';

const SkipNextOutlineIcon = resolveSvgAssetSource(SkipNextOutlineIconAsset) ?? '';

export type { MediaType } from './lib/media-type';

export type MediaDropDownSelectionSource = 'file' | 'link';

export type MediaDropDownSelection = {
    type: MediaType;
    source: MediaDropDownSelectionSource;
    label: string;
    src?: string;
    fileName?: string;
    mimeType?: string;
    link?: string;
};

/**
 * Вид поповера.
 *
 *   `tabs`     — четыре вкладки типа, тип выбирает человек (прежнее поведение, по умолчанию);
 *   `dropzone` — пунктирная дроп-зона и строка ссылки, тип выводится ИЗ САМОГО ФАЙЛА.
 *
 * В `dropzone` вкладок нет намеренно: выбирать тип заранее не нужно, когда файл уже в руках, и
 * человек почти всегда ошибался — картинка, прикреплённая как видео, показывалась плеером.
 */
export type MediaDropDownVariant = 'tabs' | 'dropzone';

export interface MediaDropDownProps {
    className?: string;
    style?: CSSProperties;
    /**
     * Вид поповера. По умолчанию `tabs` — прежнее поведение: библиотеку едят три проекта, и смена
     * вида по умолчанию была бы для них ломкой правкой вида.
     */
    variant?: MediaDropDownVariant;
    /** Тип медиа (только для `variant='tabs'`: вкладкой его выбирают). В `dropzone` — из файла. */
    value?: MediaType;
    defaultValue?: MediaType;
    onChange?: (value: MediaType) => void;
    onFileSelect?: (files: FileList | null) => void;
    selectedItem?: MediaDropDownSelection | null;
    defaultSelectedItem?: MediaDropDownSelection | null;
    onSelectedItemChange?: (value: MediaDropDownSelection | null) => void;
    onPreview?: (value: MediaDropDownSelection) => void;
    linkValue?: string;
    onLinkChange?: (value: string) => void;
    onLinkSubmit?: (value: string) => void;
    /** Заголовок дроп-зоны (`variant='dropzone'`). */
    dropTitle?: string;
    /** Подсказка дроп-зоны после разделителя «·» (`variant='dropzone'`). */
    dropHint?: string;
    /** Подсказка поля ссылки (`variant='dropzone'`). */
    linkPlaceholder?: string;
    /** Подпись кнопки подтверждения ссылки (`variant='dropzone'`). */
    linkSubmitLabel?: string;
    disabled?: boolean;
}

type MediaTypeOption = { type: MediaType; label: string; icon: string; hint: string; accept?: string };

const MEDIA_TYPES: [MediaTypeOption, ...MediaTypeOption[]] = [
    {
        type: 'image',
        label: 'Изображение',
        icon: 'ui/image/style-1/image',
        hint: 'Ссылка должна вести на изображение (JPG, PNG, WEBP)',
        accept: 'image/*',
    },
    {
        type: 'video',
        label: 'Видео',
        icon: 'ui/video/style-1/video',
        hint: 'Ссылка должна вести на видео',
        accept: 'video/*',
    },
    {
        type: 'audio',
        label: 'Аудио',
        icon: 'ui/audio/style-1/audio',
        hint: 'Ссылка должна вести на аудиофайл',
        accept: 'audio/*',
    },
    {
        type: 'file',
        label: 'Файл',
        icon: 'ui/file/style-2/file',
        hint: 'Ссылка должна вести на файл',
    },
];

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }

            reject(new Error('Unable to read media file'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('Unable to read media file'));
        reader.readAsDataURL(file);
    });
}

function isPlayableMedia(type?: MediaType) {
    return type === 'video' || type === 'audio';
}

export function MediaDropDown({
    ref,
    className = '',
    style,
    variant = 'tabs',
    value: valueProp,
    defaultValue = 'image',
    onChange,
    onFileSelect,
    selectedItem: selectedItemProp,
    defaultSelectedItem = null,
    onSelectedItemChange,
    onPreview,
    linkValue = '',
    onLinkChange,
    onLinkSubmit,
    dropTitle = 'Перетащите файл',
    dropHint = 'или нажмите, чтобы выбрать',
    linkPlaceholder = 'Вставьте ссылку',
    linkSubmitLabel = 'Добавить',
    disabled,
}: WithRef<MediaDropDownProps, HTMLDivElement>) {
    const [uncontrolledValue, setUncontrolledValue] = useState<MediaType>(defaultValue);
    const [uncontrolledSelectedItem, setUncontrolledSelectedItem] = useState<MediaDropDownSelection | null>(
        defaultSelectedItem
    );
    const [open, setOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [link, setLink] = useState(linkValue);
    const rootRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Счётчик вложенности dragenter/dragleave: события прилетают на КАЖДОГО потомка, и по одному
    // флагу зона мигала бы, пока указатель идёт по иконке и подписям внутри.
    const dragDepthRef = useRef(0);

    const value = valueProp !== undefined ? valueProp : uncontrolledValue;
    const selectedItem = selectedItemProp !== undefined ? selectedItemProp : uncontrolledSelectedItem;
    const isDropzone = variant === 'dropzone';

    const updateSelectedItem = useCallback(
        (nextValue: MediaDropDownSelection | null) => {
            if (selectedItemProp === undefined) {
                setUncontrolledSelectedItem(nextValue);
            }

            onSelectedItemChange?.(nextValue);
        },
        [onSelectedItemChange, selectedItemProp]
    );

    // Тип из файла/ссылки попадает и в значение контрола, и в выборку: иначе `value` навсегда
    // остался бы прежним, и значок пустой пилюли врал бы.
    const applyType = useCallback(
        (type: MediaType) => {
            if (!isDropzone) return;

            if (valueProp === undefined) setUncontrolledValue(type);

            onChange?.(type);
        },
        [isDropzone, onChange, valueProp]
    );

    const handleToggle = useCallback(() => {
        if (disabled) return;
        setOpen((prev) => !prev);
    }, [disabled]);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, []);

    const handleSelect = useCallback(
        (type: MediaType) => {
            if (valueProp === undefined) setUncontrolledValue(type);

            if (selectedItem?.type !== undefined && selectedItem.type !== type) {
                updateSelectedItem(null);
                setLink('');
                onLinkChange?.('');
            }

            onChange?.(type);
        },
        [onChange, onLinkChange, selectedItem, updateSelectedItem, valueProp]
    );

    const handleFileClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const acceptFile = useCallback(
        async (files: FileList | null, file: File) => {
            onFileSelect?.(files);

            let src: string | undefined;

            try {
                src = await readFileAsDataUrl(file);
            } catch {
                src = undefined;
            }

            const type = isDropzone ? resolveMediaTypeFromFile(file) : value;

            applyType(type);
            updateSelectedItem({
                type,
                source: 'file',
                label: file.name,
                src,
                fileName: file.name,
                mimeType: file.type,
            });
            setLink('');
            onLinkChange?.('');
            setOpen(false);
        },
        [applyType, isDropzone, onFileSelect, onLinkChange, updateSelectedItem, value]
    );

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const nextFiles = e.target.files;
            const nextFile = nextFiles?.[0];

            if (nextFile) {
                await acceptFile(nextFiles, nextFile);
            }

            if (e.target) e.target.value = '';
        },
        [acceptFile]
    );

    const handleLinkChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setLink(e.target.value);
            onLinkChange?.(e.target.value);
        },
        [onLinkChange]
    );

    const submitLink = useCallback(() => {
        const normalizedLink = link.trim();

        if (!normalizedLink) {
            return;
        }

        setLink(normalizedLink);

        const type = isDropzone ? resolveMediaTypeFromUrl(normalizedLink) : value;

        applyType(type);
        updateSelectedItem({
            type,
            source: 'link',
            label: normalizedLink,
            src: normalizedLink,
            link: normalizedLink,
        });
        onLinkSubmit?.(normalizedLink);
        setOpen(false);
    }, [applyType, isDropzone, link, onLinkSubmit, updateSelectedItem, value]);

    const handleLinkKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitLink();
            }
        },
        [submitLink]
    );

    const handleDragEnter = useCallback(
        (e: DragEvent<HTMLElement>) => {
            if (disabled) return;

            e.preventDefault();
            dragDepthRef.current += 1;
            setIsDragging(true);
        },
        [disabled]
    );

    const handleDragOver = useCallback(
        (e: DragEvent<HTMLElement>) => {
            if (disabled) return;

            // Без preventDefault браузер откроет файл из перетаскивания и уйдёт со страницы.
            e.preventDefault();
            setIsDragging(true);
        },
        [disabled]
    );

    const handleDragLeave = useCallback(() => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

        if (dragDepthRef.current === 0) setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLElement>) => {
            e.preventDefault();
            dragDepthRef.current = 0;
            setIsDragging(false);

            if (disabled) return;

            const droppedFiles = e.dataTransfer.files;
            const droppedFile = droppedFiles[0];

            if (droppedFile) {
                void acceptFile(droppedFiles, droppedFile);
            }
        },
        [acceptFile, disabled]
    );

    const handleClearSelection = useCallback(
        (e: ReactMouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            updateSelectedItem(null);
            setLink('');
            onLinkChange?.('');

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [onLinkChange, updateSelectedItem]
    );

    const handlePreviewSelection = useCallback(
        (e: ReactMouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();

            if (!selectedItem) {
                return;
            }

            onPreview?.(selectedItem);
        },
        [onPreview, selectedItem]
    );

    useEffect(() => {
        setLink(linkValue);
    }, [linkValue]);

    // Escape не слушаем: до этой правки его здесь не было, и добавлять поведение молча нельзя.
    useOutsideDismiss(rootRef, handleClose, { enabled: open, escape: false });

    const selectedMedia = MEDIA_TYPES.find((m) => m.type === value) ?? MEDIA_TYPES[0];
    const triggerLabel = selectedItem?.label ?? 'Добавить медиа';
    const canPreview = Boolean(selectedItem && onPreview && (selectedItem.src || selectedItem.link));
    const previewIsPlay = isPlayableMedia(selectedItem?.type);

    const setRefs = useMergedRefs(rootRef, ref);
    const fileAccept = isDropzone ? undefined : selectedMedia.accept;

    return (
        <div
            ref={setRefs}
            className={cx(styles.MediaDropDown, className)}
            style={style}
            data-open={open}
            {...stateProps(disabled && 'disabled')}
        >
            <Flex
                align={['center', 'center', 'center']}
                justify={['space_between', 'space_between', 'space_between']}
                className={styles.Trigger}
                onClick={handleToggle}
            >
                <Flex
                    align={['center', 'center', 'center']}
                    justify={['center', 'center', 'center']}
                    gap={[12, 12, 12]}
                    className={styles.TriggerContent}
                >
                    <Flex
                        align={['center', 'center', 'center']}
                        justify={['center', 'center', 'center']}
                        className={styles.TriggerIconRoot}
                    >
                        <Icon
                            name={selectedMedia.icon}
                            w={[20, 20, 20]}
                            h={[20, 20, 20]}
                            className={styles.TriggerIcon}
                        />
                    </Flex>
                    <Text variant={['caption', 'caption', 'caption']} className={styles.TriggerLabel}>
                        {triggerLabel}
                    </Text>
                </Flex>
                <Flex
                    dir={['row', 'row', 'row']}
                    align={['center', 'center', 'center']}
                    justify={['center', 'center', 'center']}
                    gap={[8, 8, 8]}
                    className={styles.TriggerActions}
                >
                    {canPreview ? (
                        <button
                            type="button"
                            className={styles.PreviewButton}
                            aria-label={previewIsPlay ? 'Воспроизвести медиа' : 'Предпросмотр медиа'}
                            onClick={handlePreviewSelection}
                        >
                            {previewIsPlay ? (
                                <Icon
                                    src={SkipNextOutlineIcon}
                                    w={[16, 16, 16]}
                                    h={[16, 16, 16]}
                                    fill="currentColor"
                                    className={styles.PlayIcon}
                                />
                            ) : (
                                <Icon
                                    src={assetUrl(eyeIcon)}
                                    w={[20, 20, 20]}
                                    h={[20, 20, 20]}
                                    fill="currentColor"
                                    className={styles.PreviewIcon}
                                />
                            )}
                        </button>
                    ) : null}
                    {selectedItem ? (
                        <button
                            type="button"
                            className={styles.ClearButton}
                            aria-label="Удалить медиа"
                            onClick={handleClearSelection}
                        >
                            <Icon
                                src={assetUrl(deleteIcon)}
                                w={[20, 20, 20]}
                                h={[20, 20, 20]}
                                stroke="currentColor"
                                className={styles.ClearIcon}
                            />
                        </button>
                    ) : null}
                    <Icon
                        name="ui/arrows/arrow-2/arrow"
                        w={[16, 16, 16]}
                        h={[16, 16, 16]}
                        className={styles.Arrow}
                    />
                </Flex>
            </Flex>

            <div className={styles.DropdownWrapper} aria-hidden={!open} inert={!open}>
                <div className={styles.DropdownInner}>
                    <Flex
                        dir={['column', 'column', 'column']}
                        gap={[8, 8, 8]}
                        className={styles.Dropdown}
                        bg='var(--white-100)'
                        r={[16, 16, 16]}
                        tlr={[0, 0, 0]}
                        trr={[0, 0, 0]}
                        // Внутренний отступ — свой у каждого вида: у вкладок снизу воздуха больше
                        // (там кнопка и подсказка), у дроп-зоны поплотнее, иначе панель уезжает под
                        // пилюлю двухэтажной коробкой.
                        p={isDropzone ? [12, 12, 16, 12] : [8, 8, 24, 8]}
                    >
                        {isDropzone ? (
                            <Flex dir={['column', 'column', 'column']} gap={[12, 12, 12]} w={['100%', null, null]}>
                                {/* Дроп-зона — китовая Button БЕЗ варианта: ни один вариант Button не
                                    выражает пунктирную рамку с подсветкой при перетаскивании, а зона
                                    обязана остаться настоящей кнопкой (фокус, Enter/Space) — клик по
                                    `div` означал бы, что с клавиатуры её не открыть. */}
                                <Button
                                    type='button'
                                    w={['100%', null, null]}
                                    p={[24, 16, 24, 16]}
                                    r={[12, 12, 12]}
                                    bg='var(--white-100)'
                                    border={['calc(1 * var(--rpx)) dashed var(--line)', null, null]}
                                    className={styles.DropZone}
                                    state={isDragging ? 'dragging' : undefined}
                                    onClick={handleFileClick}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <Flex
                                        dir={['column', 'column', 'column']}
                                        align={['center', 'center', 'center']}
                                        gap={[8, 8, 8]}
                                    >
                                        <Icon
                                            name='ui/upload/style-2/upload'
                                            w={[20, 20, 20]}
                                            h={[20, 20, 20]}
                                            className={styles.DropZoneIcon}
                                        />

                                        <Flex align={['center', 'center', 'center']} gap={[8, 8, 8]}>
                                            <Text variant={['micro', 'micro', 'micro']} color='var(--black)'>
                                                {dropTitle}
                                            </Text>
                                            <Text variant={['micro', 'micro', 'micro']} color='var(--line)' aria-hidden>
                                                ·
                                            </Text>
                                            <Text variant={['micro', 'micro', 'micro']} color='var(--text-muted)'>
                                                {dropHint}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Button>

                                <Flex align={['center', 'center', 'center']} gap={[8, 8, 8]}>
                                    <Input
                                        value={link}
                                        onChange={handleLinkChange}
                                        onKeyDown={handleLinkKeyDown}
                                        placeholder={linkPlaceholder}
                                        aria-label={linkPlaceholder}
                                        grow={[1, 1, 1]}
                                        minW={[0, 0, 0]}
                                        h={[40, 40, 40]}
                                        r={[12, 12, 12]}
                                        p={[0, 12, 0, 12]}
                                        bg='var(--white-100)'
                                        border={['calc(1 * var(--rpx)) solid var(--line)', null, null]}
                                    />

                                    {/* `bg` здесь задавать нельзя: утилита пропа лежит слоем выше
                                        покоя `variant_primary`, и вместе с заливкой уехали бы
                                        наведение и заблокированное состояние самой кнопки. */}
                                    <Button
                                        type='button'
                                        variant={['primary', 'primary', 'primary']}
                                        h={[40, 40, 40]}
                                        r={[12, 12, 12]}
                                        p={[0, 16, 0, 16]}
                                        disabled={!link.trim()}
                                        onClick={submitLink}
                                    >
                                        <Text variant={['micro', 'micro', 'micro']}>{linkSubmitLabel}</Text>
                                    </Button>
                                </Flex>
                            </Flex>
                        ) : (
                            <>
                                <div className={styles.TypeGrid}>
                                    {MEDIA_TYPES.map((media) => {
                                        const isActive = value === media.type;
                                        return (
                                            <Flex
                                                key={media.type}
                                                align={['center', 'center', 'center']}
                                                justify={['center', 'center', 'center']}
                                                gap={[6, 6, 6]}
                                                className={cx(styles.TypeButton, isActive && styles.TypeButtonActive)}
                                                onClick={() => handleSelect(media.type)}
                                            >
                                                <Icon
                                                    name={media.icon}
                                                    w={[16, 16, 16]}
                                                    h={[16, 16, 16]}
                                                    className={styles.TypeIcon}
                                                />
                                                <Text variant={['micro', 'micro', 'micro']} className={styles.TypeLabel}>
                                                    {media.label}
                                                </Text>
                                            </Flex>
                                        );
                                    })}
                                </div>

                                <Flex dir={['column', 'column', 'column']} gap={[12, 12, 12]} className={styles.UploadSection}>
                                    <button type="button" className={styles.FileButton} onClick={handleFileClick}>
                                        <Icon
                                            name="ui/upload/style-2/upload"
                                            w={[16, 16, 16]}
                                            h={[16, 16, 16]}
                                            className={styles.UploadIcon}
                                        />
                                        <Text variant={['micro', 'micro', 'micro']} className={styles.UploadLabel}>
                                            Выбрать файл
                                        </Text>
                                    </button>

                                    <Flex
                                        align={['center', 'center', 'center']}
                                        justify={['center', 'center', 'center']}
                                        gap={[8, 8, 8]}
                                        className={styles.Divider}
                                    >
                                        <span className={styles.DividerLine} />
                                        <Text variant={['micro', 'micro', 'micro']} className={styles.DividerText}>
                                            или
                                        </Text>
                                        <span className={styles.DividerLine} />
                                    </Flex>

                                    <div className={styles.LinkInputWrapper}>
                                        <input
                                            type="text"
                                            value={link}
                                            onChange={handleLinkChange}
                                            onKeyDown={handleLinkKeyDown}
                                            placeholder="Вставьте ссылку"
                                            className={styles.LinkInput}
                                        />
                                    </div>
                                    <Text variant={['micro', 'micro', 'micro']} className={styles.LinkHint}>
                                        {selectedMedia.hint}
                                    </Text>
                                </Flex>
                            </>
                        )}
                    </Flex>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={fileAccept}
                className={styles.HiddenInput}
                onChange={handleFileChange}
            />
        </div>
    );
}
