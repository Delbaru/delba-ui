# LenisScroll

Статус требований: базовый договор. Описан существующий экспорт по исходникам;
SSR, навигация и смена режима требуют отдельной проверки в потребителе.

## Назначение и выбор

Оболочка приложения с Lenis и общим scroll-контекстом, зависящая от Next navigation.
Поддерживает существующие интеграции Lenis и сброс позиции при смене маршрута.
Для нового независимого от Lenis сценария рассмотри [SmoothScroll](SmoothScroll.md).
Это не инструкция автоматически мигрировать существующего потребителя.

## Основной договор

- `children` — содержимое; `options?: Partial<LenisOptions>` уточняет настройки Lenis.
- Объект options передавай стабильным: новый объект может пересоздать экземпляр.
- Настройки по умолчанию: vertical, autoRaf, smoothWheel, duration 3 с,
  wheelMultiplier 0.8, touchMultiplier 2, syncTouch, lerp 0.1.
- Lenis включается на desktop в landscape и без reduced motion.
  На остальных режимах используется нативный провайдер.
- Оболочка сама устанавливает [LenisScrollProvider](LenisScrollProvider.md);
  дополнительный такой же провайдер внутри обычно не нужен.
- `useLenisScroll` даёт scrollTo, живой scrollY, подписку и необязательный stopScroll.

## Минимальный пример

```tsx
'use client';
import { LenisScroll } from '@delba/ui';

const options = { lerp: 0.12, wheelMultiplier: 0.9 };

export function Page() {
  return <LenisScroll options={options}>
    <main>Содержимое страницы</main>
  </LenisScroll>;
}
```

Пример предназначен для приложения Next с доступным router-контекстом.

## Состояния и ограничения

Медиа-запросы пересчитываются при смене ширины, ориентации и reduced motion.
Смена Lenis/native-ветки перемонтирует поддерево: локальное состояние может сброситься.
Смена pathname останавливает ход и переводит к якорю маршрута либо началу страницы.
Публичный props-интерфейс не включает className, DOM ref или layout-props.
Не устанавливай параллельно два движка, перехватывающих прокрутку одного окна.

## Критерии приёмки

Проверь desktop-landscape, mobile, portrait и reduced motion, включая смену на лету.
Проверь переходы между маршрутами с якорем и без него, ввод, фокус и вложенный скролл.
Учти перемонтирование: сохранность формы должна обеспечиваться сценарием приложения.

Договор: [реализация и options](../../../../src/components/LenisScroll/LenisScroll.tsx),
[контекст](../../../../src/components/LenisScroll/LenisScrollContext.tsx),
[приёмка](../../verification/acceptance.md).
