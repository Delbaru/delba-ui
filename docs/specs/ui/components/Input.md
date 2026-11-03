# Input

Статус: текущая реализация общего полевого механизма. Полная браузерная приёмка
выполняется после завершения миграции DelbaUI.

Публичный вызов Input остаётся прежним: проект передаёт props, значение и callback,
не собирает controller, маску, подписки или календарь вручную. Внутри компонент
собирает читаемые части: оболочку поля, нативный control/маску, действия, календарь
и подсказку переполнения. Части имеют собственную обязанность и не получают
полный контекст приложения. InputCalendar и InputOverflow владеют интеграцией
соответствующей поверхности с полем; простое переименование Calendar/Tooltip
не выполняет этот договор.

### Зафиксированная композиция

Согласованная композиция, сохранённая в реализации:

```tsx
'use client';

import type { WithRef } from '../../core';
import { FieldFrame } from '../Field';
import { InputControl } from './InputControl/InputControl';
import { InputActions } from './InputActions/InputActions';
import { InputCalendar } from './InputCalendar/InputCalendar';
import { InputOverflow } from './InputOverflow/InputOverflow';
import { useInput } from './Input.model';
import type { InputProps } from './Input.types';

export type { InputProps } from './Input.types';

export function Input(props: WithRef<InputProps, HTMLInputElement>) {
  const input = useInput(props);

  return (
    <FieldFrame layout={input.layout} label={input.label} feedback={input.feedback}>
      <InputControl
          control={input.control}
          decoration={input.decoration}
          start={props.slots?.start}
          end={props.slots?.end}
      >
        <InputActions actions={input.actions} />
      </InputControl>

      <InputCalendar calendar={input.calendar} />

      <InputOverflow tooltip={input.tooltip} />
    </FieldFrame>
  );
}
```

`../Field` — внутренний модуль общей оболочки и модели, не публичный export пакета.
Внутренний Field не становится автоматически новым компонентом пакета.
Прежнее предложение оставить оболочку приватной внутри Input заменено этой
согласованной композицией. Общая оболочка не импортирует типы или модель Input:
направление зависимости — Input → Field. Существующий export InputProps должен
сохраниться в публичном входе; пример композиции не отменяет совместимость.

### Границы частей

| Часть | Собственная обязанность | Не допускается |
| --- | --- | --- |
| Input | Показать композицию | Расчёт ошибок, каретки и условий календаря прямо в JSX |
| FieldFrame | Разложить подпись, children и feedback | Ветки phone/time/date, события ввода, управление календарём |
| InputControl | Нативный input, декорация и slots | Второе состояние значения и правила проверки |
| InputActions | Представить доступные действия и связать их с командами модели | Копии алгоритмов reveal/step/calendar |
| InputCalendar | Отобразить календарь и соединить его выбор/фокус с полем | Дублирование движка Calendar |
| InputOverflow | Подключить поверхность подсказки переполнения | Вторая реализация измерения текста/Tooltip |
| useInput | Соединить модели в узкие интерфейсы частей | Перенос всей прежней use-input-behavior в новый файл |

`layout` содержит только оформление и раскладку. `label` описывает подпись;
`feedback` — подготовленное состояние сообщения. `control`, `decoration`,
`actions`, `calendar`, `tooltip` передают только возможности соответствующей
части. Точные типы, а не названия объектов, должны доказать эти границы.
Нельзя добавить внутрь `layout` общий behavior, а затем раскрыть его в FieldFrame.

Внутри модели обязанности также разделены: значение, взаимодействия, режимы,
проверки, оформление и низкоуровневые механизмы. Focus/blur/change читаются как
предметные шаги; они не перебирают вручную все варианты поля. У одного события
сохраняются явный порядок выполнения, отмена и однократный внешний callback.
Алгоритм режима остаётся у режима; правила валидации и публикация результата —
у проверки; DOM и caret — у соответствующего механизма ядра.

### Утверждённое устройство

Общая схема — [читаемый API](../../architecture/readable-api.md).
Композиция, модели и форматы имеют разных владельцев. Каждая визуальная часть
находится в именованной папке со своим SCSS; логические модули не создают DOM.

```text
Input/
  Input.tsx
  Input.model.ts
  Input.config.ts
  Input.modes.ts
  Input.types.ts
  Input.module.scss
  index.ts
  InputControl/
    InputControl.tsx
    InputControl.module.scss
    InputValue/InputValue.tsx + InputValue.module.scss
    InputPhoneMask/InputPhoneMask.tsx + InputPhoneMask.module.scss
    InputInlineError/InputInlineError.tsx + InputInlineError.module.scss
  InputActions/InputActions.tsx + InputActions.module.scss
  InputCalendar/InputCalendar.tsx + InputCalendar.module.scss
  InputOverflow/InputOverflow.tsx + InputOverflow.module.scss
  formats/time.ts, number.ts, constraints.ts
  tests/
```

- Input.tsx сохраняет приведённую композицию и публичный InputProps export.
- Input.model соединяет поле, календарь, действия, feedback, движение и overflow;
  он не содержит phone/time/number веток записи и не хранит вторую модель значения.
- Input.config отделяет native props от проектирования вида; оформление — чистый
  расчёт. React-motion подключается моделью явно, не скрывается в конфиге.
- Input.modes — единый реестр и resolver; он задаёт FieldPolicy, native-атрибуты,
  декорацию, возможность календаря и размещение ошибки. Хуки из реестра не вызываются.
- InputControl собирает InputValue, InputPhoneMask и InputInlineError. У частей
  собственные стили, но нет копий модели значения или правил проверки. Маска
  времени остаётся частью InputValue: она не самостоятельное поле.
- InputOverflow соединяет существующие измерение/Tooltip и их представление.
- [Calendar](Calendar.md) — самостоятельный UI-компонент. InputCalendar подключает
  его к полю: управляет открытием, порталом, клавиатурой, закрытием и преобразует
  дату поля в ISO. JSX календаря не переносится в Core.
- formats содержит специфичные time/number/constraints алгоритмы. Общие даты
  принадлежат core/fields/date с двумя потребителями Calendar и Input; phone —
  core/fields/phone с реальными server/browser validation consumers.

Вне Input общий Field/Field.model владеет хранением controlled/uncontrolled значения,
редактированием, завершением, выбором, шагом, reset и публикацией результата.
Popup-сборка InputCalendar использует общий с Dropdown useFloatingSurface: один
владелец portal host, позиции и dismiss. При escape дата отменяется без проверки,
при outside/blur выполняется проверка и снимается активность поля.
Его двери: field.value.edit/finish/pick/step/reset, field.validation.check,
field.focus.request. Политика определяет преобразование, не хранит состояние React.
Разные draftKey сохраняют отдельные черновики при смене режима;
при переходе model → native восстанавливается также DOM того же input. ключи и правила
инициализации задаёт режим, общий механизм не знает названий phone/time/date.

Core/fields/policy содержит нейтральный договор преобразования. Native selection,
ref и cleanup принадлежат низкому уровню. Field не импортирует Input, его формат,
CSS или календарь. Поля других компонентов не мигрируются в рамках этой задачи.

Редактирование разделяет native onChange и onValueChange. Первый получает настоящее
событие до преобразования. Phone сохраняет исходный текст также в событии второго
callback; отформатированная модель передаётся отдельным аргументом. Восстановление
каретки учитывает ownerDocument, замену target, направление выделения и unmount.
Порядок DOM write/публикации задаётся явным результатом преобразования, а не ветками
по названию режима в общем движке.

Required проверяется до специфичной проверки режима. Обычное редактирование не
показывает новую ошибку преждевременно, но исправляет уже показанную; завершение,
выбор и шаг проверяют итог. Исправление запрещённого числового ввода сохраняет
существующую немедленную проверку. Seed очищается по фокусу и восстанавливается
при уходе только у допускающей его политики и изменяемого поля.

### Представление и сообщения

Геометрия, поддержанная props, задаётся props. В SCSS остаются native-селекторы,
псевдоэлементы, маски, состояния и правила, не выраженные имеющимся API; новый
prop не создаётся только ради сокращения CSS. JSDoc кратко описывает договор,
default и существенный эффект; продуктовые истории и цитаты в типах не хранятся.
Сохранение фокуса на mousedown действия использует core preserveFocus; условия
применения принадлежат view. Пустые папки удаляются вместе с последними файлами.


Для контейнеров используются Flex и подходящие примитивы кита; голый div не
подменяет их без конкретной технической необходимости. Нативный input остаётся
настоящим input. Оболочка FieldFrame в последнем примере одобрена по направлению:
короткая композиция с типизированными входами и Text для текста. Полный договор
inline/below feedback, доступности и анимации проверяется вместе с поведением.

`Text as="label" htmlFor={id}` используется вместо label с вложенным Text.
TextProps объявляет htmlFor; расширение описано на странице Text. Проверка
включает клик/фокус и доступное имя. Декоративная звёздочка не заменяет
required/aria-семантику.

Общие сообщения проверок получают единый типизированный источник настройки;
поле может переопределить сообщение. Механизм не хранит копию текста required
в каждом режиме. Переводы предусмотрены как возможность будущего расширения,
но выбор языка, locale provider и загрузка переводов сейчас не внедряются.
Настройка — `ui.config.messages.validation/input/calendar`, с частичным
переопределением и проверкой структуры при генерации. Проп emptyMessage сохраняет
приоритет над общим required. Подробности — [development](../../../development.md).

Сообщение ниже поля использует Text.collapse: этот компонент уже сохраняет текст
до завершения закрытия. Дополнительный Flex.collapse и useState/useRef для копии
текста в FieldFeedback запрещены как дублирование. Ошибка и комментарий собраны
через Flex, без Fragment. Внешний gap не дублирует анимированный collapse gap.
Проверяются error → comment → empty, aria-describedby, объявления screen reader,
незанятое место при пустом сообщении и фазы collapse.

В Input и Calendar больше нет вызовов animation/transitionKey. Смена skeleton/value
и months/days использует `animate={{ when: 'change', effect: 'fade', key, duration: 'fast' }}`;
появление ошибки — `when: 'load'`. Flex переводит объект в общий useContentMotion /
useSwapTransition: второй движок не создаётся. Правило общее для всех контуров,
см. [движение](../motion.md).

### Чеклист реализации

- [ ] Перед возобновлением утверждены конкретное дерево и полные существенные
  файлы будущего Input; общие зависимости также раскрыты. Итоговые файлы сверены
  с показанными примерами, без молчаливой замены архитектуры.
- [ ] Реализация начинается после согласования полного внутреннего эталона;
  нет молчаливой замены показанной композиции на другую версию.
- [ ] Показаны целые существенные файлы «сейчас → будет», а не только два
  внешних компонента. Каждая оставленная часть явно названа и проверена.
- [ ] Прочитаны целые новые части, controller, режимы и их вызовы до core.
- [ ] У модели, событий, режимов, проверок, оформления и представления понятные
  границы; предметные операции доступны через типизированные двери.
- [ ] FieldFrame не импортирует Input; нет мешка flags/refs, скрытого в layout.
- [ ] Контейнеры собраны примитивами кита; подпись семантически связана с input.
- [ ] FieldFeedback использует Text.collapse без второй обёртки сворачивания
  и отдельного состояния текста. Нет Fragment вместо осмысленной Flex-композиции;
  не добавлены пустой зазор или компенсация зазора лишней обёртки.
- [ ] Сообщения настроены через одного владельца; полная локализация не добавлена.
- [ ] Публичные props/exports/defaults, input DOM ref и native event сохранены.
- [ ] Native `onChange` и `onValueChange(value, details)` не смешаны и не вызываются дважды.
- [ ] Проверены controlled/uncontrolled ввод, defaultValue, reset и отменённый reset.
- [ ] Пройдены text/email/number/tel/time/date, seed, readonly/disabled и autofill.
- [ ] Реальный ввод, paste, выделение, Backspace/Delete и каретка сохранены.
- [ ] Loading не теряет ref; slots, подпись, комментарий и aria-describedby связаны.
- [ ] Пароль, шаг числа, календарь, Tab/Escape, фокус портала и tooltip работают.
- [ ] Layout/skin и DOM-селекторы сохранены; collapse/motion и reduced motion сохраняют договор.
- [ ] Observer, слушатели и rAF снимаются; отложенный caret не пишет в заменённый узел.
- [ ] Нет второй модели значения и новой солянки внутри короткого hook.
- [ ] Выполнены гейты библиотеки и проверка настоящего потребителя; результаты
  отделены от непроверенного. Общая миграция других компонентов разрешена владельцем; итоговая приёмка общая.

## Назначение и применение

Однострочное поле с общей моделью ввода, форматированием и обратной связью.
Готовые DInput/DField потребителя задают оформление и пресеты экрана;
не копируй в них маску, шаг числа, календарь или механику ошибки.

## Основной API

- `type='text'`; поддерживаются специальные режимы телефона, числа, даты и времени.
- `value` + `onValueChange(value, details)` — модель после форматирования;
  `defaultValue` — начальное значение неуправляемого поля.
- `onChange(event)` — настоящее событие до форматирования; это другой контракт.
- `variant`: `primary`/`secondary`; `size`: `default`/`fullWidth`.
  Общий resolver задаёт `primary` и `default`, если нет явной геометрии.
- `label`, `comment`, `error`, `required`, `validate(value)`, `length`, `seed`.
- `loading=false`, `revealable=false`, `showNumberControls=true`;
  `errorPlacement='inside'`, `nativeValidation=false`.
- `slots.start/end`, `field`, `rowClassName`; DOM ref указывает на input.

## Пример

Клиентский компонент; callback получает строку модели, не DOM-событие:

```tsx
'use client';
import { useState } from 'react';
import { Input } from '@delba/ui';

export function NameField() {
  const [name, setName] = useState('');
  return <Input label="Имя" value={name} onValueChange={setName} />;
}
```

## Состояния и ограничения

У ошибки приоритет над комментарием. `inside` освобождает значение при фокусе;
у телефонного режима ошибка всегда ниже поля. `seed` — значение-подсказка
с отдельными изменениями модели на focus/blur; `details.event` бывает `null`.
У поля с `readOnly` фокус и уход не меняют модель через `seed`; `autoComplete='off'`
не снимает явный `readOnly`.
Формат `type='tel'` по умолчанию российский; международный выбор — PhoneField.

## Приёмка изменения

- Ввод и форматирование возвращают ожидаемую модель без потери курсора и DOM ref.
- Ошибка, loading, подпись и клавиатура проверены в используемом типе поля.
- Программный шаг/выбор не подменяет настоящий `onChange` синтетическим событием.

[Типы](../../../../src/components/Input/Input.types.ts) · [Реализация](../../../../src/components/Input/Input.tsx) ·
[PhoneField](PhoneField.md) · [Приёмка](../../verification/acceptance.md)

## Интеграция Calendar через Dropdown

InputCalendar использует Dropdown с внешним anchorRef, surfaceRef и focusRegions.
Фиктивного trigger и дополнительной обёртки поля нет. keyboard='content' оставляет
календарные клавиши Calendar; Dropdown владеет portal, position, dismiss и поверхностью.
InputCalendar переводит ISO Calendar в формат поля, выбирает реакцию на Escape
и закрытие и восстанавливает фокус.

Политика date использует blur='scope': проверка принадлежит завершению взаимодействия
с полем и его popup, а не переходу с input на календарную кнопку. enter/open начинает
новый сеанс; повторные outside+blur одного сеанса не вызывают custom validator дважды.
Фокус по Tab и уход без открытия popup всё равно проверяют обязательное поле.
Изменённое значение проверяется повторно. Выбор и Escape не подменяют native onChange.

Внутренние импорты FieldFrame идут через ../Field. Field engine теперь используется
также Textarea: один протокол хранения, seed/reset, событий, readonly и публикации.
Режим задаёт чистую политику; JSX не знает, как хранится controlled/uncontrolled draft.

Визуальный договор маски времени: реальный ввод расположен над суффиксом, суффикс
сохраняет цвет placeholder. Inline-ошибка скрывает и color, и webkit-text-fill-color
значения; фокус возвращает видимый текст. Проверяются computed styles и настоящий
частичный ввод, не только наличие mask-узла.

Input поддерживает внешний native label. InputActions помечает всю зону своих
действий и отменяет default click label, сохраняя обработчик конкретного действия:
нажатие на рамку календаря не создаёт второй click поля и не закрывает popup.
Этот договор проверяется настоящим pointer click по padding, а не dispatchEvent.
