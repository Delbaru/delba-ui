import { assetUrl } from '#core';
import imageIcon from '#icons/controls/media-image.svg';
import videoIcon from '#icons/controls/media-video.svg';
import audioIcon from '#icons/controls/media-audio.svg';
import fileIcon from '#icons/controls/media-file.svg';
import uploadIcon from '#icons/controls/upload.svg';
import type { MediaType } from './lib/media-type';

type MediaTypeOption = {
  type: MediaType;
  label: string;
  iconSrc: string;
  hint: string;
  accept?: string;
};

export const MEDIA_UPLOAD_ICON = assetUrl(uploadIcon);

export const MEDIA_TYPES: [MediaTypeOption, ...MediaTypeOption[]] = [
  {
    type: 'image',
    label: 'Изображение',
    iconSrc: assetUrl(imageIcon),
    hint: 'Ссылка должна вести на изображение (JPG, PNG, WEBP)',
    accept: 'image/*',
  },
  {
    type: 'video',
    label: 'Видео',
    iconSrc: assetUrl(videoIcon),
    hint: 'Ссылка должна вести на видео',
    accept: 'video/*',
  },
  {
    type: 'audio',
    label: 'Аудио',
    iconSrc: assetUrl(audioIcon),
    hint: 'Ссылка должна вести на аудиофайл',
    accept: 'audio/*',
  },
  {
    type: 'file',
    label: 'Файл',
    iconSrc: assetUrl(fileIcon),
    hint: 'Ссылка должна вести на файл',
  },
];
