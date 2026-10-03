/**
 * Тип медиа и его разбор — ОТДЕЛЬНО от компонента.
 *
 * Отдельным файлом не для красоты: вызывающему нужен тот же тип, что положил сам
 * `MediaDropDown`, и он не должен за это тянуть в тест модуль со scss и React. Здесь только
 * чистые функции — их и дёргает тест.
 */

export type MediaType = 'image' | 'video' | 'audio' | 'file';

/**
 * Расширения, по которым тип угадывается, когда mime недостоверен или его нет вовсе
 * (перетаскивание из архива, старые браузеры, `blob:`-ссылки). Ключ — расширение без точки,
 * в нижнем регистре.
 */
const MEDIA_TYPE_BY_EXTENSION: Readonly<Record<string, MediaType>> = {
    jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image', bmp: 'image',
    svg: 'image', avif: 'image', heic: 'image', heif: 'image', tif: 'image', tiff: 'image', ico: 'image',
    mp4: 'video', webm: 'video', ogv: 'video', mov: 'video', m4v: 'video', mkv: 'video', avi: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', oga: 'audio', m4a: 'audio', flac: 'audio', aac: 'audio',
    opus: 'audio', wma: 'audio',
    pdf: 'file', doc: 'file', docx: 'file', xls: 'file', xlsx: 'file', ppt: 'file', pptx: 'file',
    txt: 'file', csv: 'file', zip: 'file', rar: 'file', '7z': 'file', json: 'file',
};

function mediaTypeFromMime(mime: string): MediaType | undefined {
    const [kind] = mime.split('/');

    if (kind === 'image' || kind === 'video' || kind === 'audio') return kind;

    return undefined;
}

/** Расширение имени файла без точки, в нижнем регистре. Нет расширения — пустая строка. */
function fileExtension(name: string): string {
    const dot = name.lastIndexOf('.');

    // `dot > 0`, а не `>= 0`: у «.gitignore» точки-разделителя нет, и «.gitignore» — не расширение.
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * Тип медиа из самого файла: сначала mime, потом расширение, иначе `file`.
 *
 * Считать его на стороне вызывающего нельзя — разбор расходился бы с тем, что панель показала
 * в пилюле, и картинка уезжала бы в модель файлом.
 */
export function resolveMediaTypeFromFile(file: File): MediaType {
    return mediaTypeFromMime(file.type) ?? MEDIA_TYPE_BY_EXTENSION[fileExtension(file.name)] ?? 'file';
}

/**
 * Тип медиа из ссылки. Взять больше неоткуда: у адреса нет mime, и остаётся только расширение
 * в имени. Без расширения тип неизвестен, и `file` тут единственный честный ответ — предпросмотр
 * покажет имя, а не плеер.
 */
export function resolveMediaTypeFromUrl(url: string): MediaType {
    // Запрос и хеш отрезаются: без этого «photo.jpg?w=100» дал бы расширение «jpg?w=100».
    const [path = ''] = url.trim().split(/[?#]/);
    const [name = ''] = path.split(/[\\/]/).reverse();

    return MEDIA_TYPE_BY_EXTENSION[fileExtension(name)] ?? 'file';
}
