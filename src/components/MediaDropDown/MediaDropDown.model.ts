'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { stateProps, useMergedRefs, type WithRef } from '../../core';
import { MediaOperationOwner } from './lib/operation-owner';
import { readFileAsDataUrl } from './lib/read-file';
import {
  resolveMediaTypeFromFile,
  resolveMediaTypeFromUrl,
  type MediaType,
} from './lib/media-type';
import { MEDIA_TYPES } from './MediaDropDown.config';
import type { MediaDropDownProps, MediaDropDownSelection } from './MediaDropDown.types';

export function useMediaDropDown(props: WithRef<MediaDropDownProps, HTMLDivElement>) {
  const [storedType, setStoredType] = useState<MediaType>(props.defaultValue ?? 'image');
  const [storedItem, setStoredItem] = useState<MediaDropDownSelection | null>(
    props.defaultSelectedItem ?? null,
  );
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState(props.linkValue ?? '');
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const operation = useRef(new MediaOperationOwner()).current;
  const disabled = useRef(Boolean(props.disabled));
  disabled.current = Boolean(props.disabled);
  const dragDepth = useRef(0);
  const panelId = useId();
  const root = useMergedRefs(rootRef, props.ref);
  const cancel = useCallback(() => operation.cancel(), [operation]);
  const type = props.value ?? storedType;
  const item = props.selectedItem !== undefined ? props.selectedItem : storedItem;
  const dropzone = props.variant === 'dropzone';
  const selectedType = MEDIA_TYPES.find((option) => option.type === type) ?? MEDIA_TYPES[0];

  function changeItem(next: MediaDropDownSelection | null) {
    if (props.selectedItem === undefined) setStoredItem(next);
    props.onSelectedItemChange?.(next);
  }

  function changeType(next: MediaType) {
    if (props.value === undefined) setStoredType(next);
    props.onChange?.(next);
  }

  function changeLink(next: string) {
    setLink(next);
    props.onLinkChange?.(next);
  }

  function select(next: MediaDropDownSelection) {
    if (disabled.current) return;
    if (dropzone) changeType(next.type);
    changeItem(next);
    setOpen(false);
  }

  async function acceptFile(files: FileList | null, file: File) {
    if (disabled.current) return;
    const reading = operation.begin();
    props.onFileSelect?.(files);
    let src: string | undefined;
    try {
      src = await readFileAsDataUrl(file, reading.signal);
    } catch {
      src = undefined;
    }
    if (disabled.current || !reading.isCurrent()) return;
    reading.finish();
    select({
      type: dropzone ? resolveMediaTypeFromFile(file) : type,
      source: 'file',
      label: file.name,
      src,
      fileName: file.name,
      mimeType: file.type,
    });
    changeLink('');
  }

  function submitLink() {
    const url = link.trim();
    if (disabled.current || !url) return;
    cancel();
    setLink(url);
    select({
      type: dropzone ? resolveMediaTypeFromUrl(url) : type,
      source: 'link',
      label: url,
      src: url,
      link: url,
    });
    props.onLinkSubmit?.(url);
  }

  function chooseType(next: MediaType) {
    if (disabled.current) return;
    cancel();
    changeType(next);
    if (item && item.type !== next) {
      changeItem(null);
      changeLink('');
    }
  }

  function clear(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (disabled.current) return;
    cancel();
    changeItem(null);
    changeLink('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function preview(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!disabled.current && item) props.onPreview?.(item);
  }

  function enterDrag(event: DragEvent<HTMLElement>) {
    if (disabled.current) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function leaveDrag() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = event.dataTransfer.files;
    const file = files[0];
    if (file) void acceptFile(files, file);
  }

  useEffect(() => {
    if (!props.disabled) return;
    cancel();
    setOpen(false);
    setDragging(false);
    dragDepth.current = 0;
  }, [cancel, props.disabled]);
  useEffect(() => () => cancel(), [cancel]);
  useEffect(() => {
    cancel();
  }, [cancel, props.value, props.selectedItem]);
  useEffect(() => {
    cancel();
    setLink(props.linkValue ?? '');
  }, [cancel, props.linkValue]);

  return {
    root: {
      ref: root,
      className: props.className,
      style: props.style,
      ...stateProps(props.disabled && 'disabled'),
    },
    popup: {
      anchor: rootRef,
      id: panelId,
      open: open && !props.disabled,
      change: setOpen,
      toggle: () => {
        if (!disabled.current) setOpen((value) => !value);
      },
    },
    type: {
      current: type,
      options: MEDIA_TYPES,
      selected: selectedType,
      choose: chooseType,
      dropzone,
    },
    selection: {
      item,
      clear,
      preview,
      canPreview: Boolean(item && props.onPreview && (item.src || item.link)),
      playable: item?.type === 'audio' || item?.type === 'video',
    },
    file: {
      ref: fileRef,
      accept: dropzone ? undefined : selectedType.accept,
      open: () => {
        if (!disabled.current) fileRef.current?.click();
      },
      change: async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.currentTarget.files;
        const file = files?.[0];
        if (file) await acceptFile(files, file);
        event.target.value = '';
      },
    },
    link: {
      value: link,
      change: (event: ChangeEvent<HTMLInputElement>) => {
        if (!disabled.current) {
          cancel();
          changeLink(event.target.value);
        }
      },
      submit: submitLink,
      keyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          submitLink();
        }
      },
      placeholder: props.linkPlaceholder ?? 'Вставьте ссылку',
      submitLabel: props.linkSubmitLabel ?? 'Добавить',
    },
    drag: {
      active: dragging,
      enter: enterDrag,
      leave: leaveDrag,
      drop,
      over: (event: DragEvent<HTMLElement>) => {
        if (!disabled.current) {
          event.preventDefault();
          setDragging(true);
        }
      },
    },
    labels: {
      title: props.dropTitle ?? 'Перетащите файл',
      hint: props.dropHint ?? 'или нажмите, чтобы выбрать',
    },
    disabled: props.disabled,
  };
}

export type MediaDropDownModel = ReturnType<typeof useMediaDropDown>;
