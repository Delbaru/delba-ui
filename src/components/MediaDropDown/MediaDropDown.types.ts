import type { CSSProperties } from 'react';
import type { MediaType } from './lib/media-type';

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

/** tabs выбирает тип вручную; dropzone определяет его по файлу или ссылке. */
export type MediaDropDownVariant = 'tabs' | 'dropzone';

export interface MediaDropDownProps {
  className?: string;
  style?: CSSProperties;
  /** Вид выбора медиа. По умолчанию tabs. */
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
