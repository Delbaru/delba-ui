import type { MediaType } from './lib/media-type';

type MediaTypeOption = {
  type: MediaType;
  label: string;
  icon: string;
  hint: string;
  accept?: string;
};

export const MEDIA_TYPES: [MediaTypeOption, ...MediaTypeOption[]] = [
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
