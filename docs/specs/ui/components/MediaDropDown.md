# MediaDropDown

Выбор файла или ссылки на медиа с отображением выбранного элемента.
Используй для прикрепления одного изображения, видео, аудио или файла.
Публичное имя — именно `MediaDropDown`.

## Основной договор

| Проп | Значение |
|---|---|
| `variant` | `tabs` по умолчанию; `dropzone` определяет тип по файлу/ссылке |
| `value` / `defaultValue` | MediaType; начальный тип `image` |
| `onChange` | Изменение типа медиа |
| `selectedItem` / `defaultSelectedItem` | Выбор; начальное значение null |
| `onSelectedItemChange` | Новый MediaDropDownSelection или null |
| `onFileSelect` | FileList/null; передачей на сервер владеет потребитель |
| `onPreview` | Запрос предпросмотра выбранного элемента |
| `linkValue`, `onLinkChange`, `onLinkSubmit` | Значение ссылки и события редактирования/подтверждения |
| `disabled` | Блокирует действия и закрывает панель |

Типы: `image | video | audio | file`. Selection содержит type/source/label
и опциональные src, fileName, mimeType, link.
Для dropzone доступны dropTitle, dropHint, linkPlaceholder, linkSubmitLabel;
по умолчанию последняя подпись — «Добавить».

## Пример

```tsx
'use client';
import { useState } from 'react';
import { MediaDropDown, type MediaDropDownSelection } from '@delba/ui';

export function Attachment() {
  const [item, setItem] = useState<MediaDropDownSelection | null>(null);
  return <>
    <MediaDropDown variant="dropzone"
      selectedItem={item} onSelectedItemChange={setItem} />
    <output>{item?.label ?? 'Файл не выбран'}</output>
  </>;
}
```

## Состояния и ограничения

В tabs человек выбирает тип; в dropzone он определяется автоматически.
SelectedItem и тип имеют независимые controlled/uncontrolled режимы.
Компонент читает первый выбранный файл для локального представления; это не upload,
не постоянный URL и не проверка безопасности/размера файла на сервере.
Во время асинхронного чтения переход в disabled предотвращает принятие результата.
Панель управляется внутренне; публичного open/onOpenChange здесь нет.

## Приёмка

Проверь файл, drag-and-drop, ссылку, смену типа, удаление выбора и callback.
Проверь disabled до и во время чтения, клавиатуру, закрытие снаружи
и выбранный элемент при controlled-обновлении.

Источник: [MediaDropDown.tsx](../../../../src/components/MediaDropDown/MediaDropDown.tsx),
[определение типа](../../../../src/components/MediaDropDown/lib/media-type.ts).
Договор сверён с исходником, не с браузерным сценарием.

## Композиция и владельцы

MediaDropDown.model разделяет typed двери popup/type/selection/file/link/drag.
Один select принимает результат файла или ссылки, сохраняя controlled/uncontrolled
владение типом и выбором. MediaOperationOwner отменяет устаревшее чтение при смене
операции, disabled и unmount. File input сбрасывается после обработки для повторного
выбора того же файла. Загрузкой на сервер по-прежнему владеет потребитель.

MediaTrigger, MediaDropzone и MediaTabs находятся в собственных именованных папках
и импортируют только свои SCSS. Основной компонент соединяет их через общий Dropdown;
ручного outside-dismiss и второго CSS-движка открытия больше нет. Панель использует
объектный open animate. Сохраняется прежняя политика MediaDropDown: снаружи закрывается,
blur/Escape сами по себе не закрывают. Trigger доступен Enter/Space; кнопки preview/clear
не переключают popup и не отбирают владение выбором у потребителя.
