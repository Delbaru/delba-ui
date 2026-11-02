# LexicalTextarea

Статус: реализованный договор; итоговая проверка редактора в Playwright выполняется
после завершения общего рефакторинга. Публичные exports и документный handle сохранены.

## Назначение и API

Форматированный документ со списками, ссылками и переменными. Для обычного текста
используй Textarea. Папка реализации называется RichTextarea.

- content — документ или строка. Изменение внешней сигнатуры синхронизирует редактор
  без пользовательского onChange. Это не нативный controlled value input.
- onChange получает { json, plainText, characters, isEmpty }, а не DOM-событие.
- variant='style-1': default, plain, style-1…style-5. Публичный richTextClasses
  обеспечивает ту же типографику, что в LexicalText; редактор не импортирует чужой SCSS.
- variables=[] определяет доступные токены. allowLink=true показывает кнопку ссылки;
  false скрывает её и не заменяет серверную проверку URL/контента.
- label/labelColor, placeholder/placeholderColor, comment/error оформляют поле.
  Внешняя error имеет приоритет над проверками; helper связывается aria-describedby.
- required, minLength, maxLength, validate проверяют документ. Пустое необязательное
  значение не нарушает minLength; maxLength показывает ошибку, не блокирует ввод.
- ref — LexicalTextareaHandle: focus, reset, setContent, insertVariable, getValue.
  reset/setContent сообщают новый snapshot через onChange; внешняя синхронизация — нет.
- collapse сворачивает полную композицию. Root layout и геометрия окрашенного поля
  разделены editorLayout; прежние padding/border/размеры относятся к полю, grow — к корню.
- Собственных disabled/readOnly/loading у этого API нет; их не обещают в примерах.

## Пример

```tsx
'use client';
import { useState } from 'react';
import { Flex, LexicalTextarea, Text, type LexicalTextareaChangePayload } from '@delba/ui';

export function DescriptionEditor() {
  const [draft, setDraft] = useState<LexicalTextareaChangePayload | null>(null);
  return <Flex dir={['column', 'column', 'column']} gap={[8, 8, 8]}>
    <LexicalTextarea label="Описание" content="Начальный текст" onChange={setDraft} maxLength={2000} />
    <Text variant={['caption', 'caption', 'caption']}>{draft?.characters ?? 0}</Text>
  </Flex>;
}
```

## Настройки текстов

Общий ui.config messages.richTextarea задаёт required, minLength с {min}, maxLength
с {max}, названия форматирования, подсказку переменных, prompt/error ссылок.
SSR и клиент читают один generated словарь. emptyMessage экземпляра остаётся
явным переопределением required; полноценных runtime-языковых провайдеров это не добавляет.

## Композиция и ответственность

LexicalTextarea соединяет label, окрашенное поле, LexicalComposer, toolbar/counter
и feedback. useLexicalTextarea владеет snapshot и handle, отдаёт двери editor,
feedback, counter. Один receive обновляет JSON, метаданные и UI для всех входных путей;
одна replaceContent обслуживает reset/setContent. validateEditorContent задаёт
порядок required → length → custom.

Самостоятельные виды имеют именованные папки и собственный SCSS:
LexicalTextareaEditor, LexicalTextareaToolbar, LexicalTextareaToolbarButton.
VariableNode также имеет свою папку и стиль настоящего текстового DOM-узла.
Основной класс LexicalTextarea находится на существующем корне; лишней оболочки нет.
Мелкие label/counter/feedback остаются Text внутри композиции.

LexicalTextareaEditor соединяет существующие плагины: history, list/link, reference,
external content sync, variables. Отмена microtask при StrictMode сохраняется:
сигнатура применяется только после успешной записи контента.
Toolbar владеет подпиской на Lexical selection и командами форматирования; кнопка
сохраняет выделение через общий preserveFocus. Prompt использует документ редактора.

## Приёмка

Ввод/выделение/paste, undo/redo, форматирование и link; начальный content в StrictMode,
внешняя синхронизация без user change; reset/setContent/insertVariable/getValue;
удаление токена, двойной клик/drag; ошибки длины и required, внешний error,
keyboard toolbar, aria helper, collapse и unmount. Проверить локализованные labels.
Unit проверяет порядок валидации, разделение layout, словарь переменных и URL;
это не заменяет итоговый браузерный сценарий.

[Композиция](../../../../src/components/RichTextarea/LexicalTextarea.tsx) ·
[Props](../../../../src/components/RichTextarea/LexicalTextarea.types.ts) ·
[Модель](../../../../src/components/RichTextarea/useLexicalTextarea.ts) ·
[Payload/handle](../../../../src/components/RichTextarea/types.ts).
