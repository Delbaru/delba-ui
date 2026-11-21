# ActionInvocationProvider и useActionInvocation

Общий контроллер действия для кнопки или нескольких способов запуска одного действия.
Реализован в [useActionInvocation.tsx](../../../../src/hooks/useActionInvocation.tsx).
Проверка интеграции выполняется в потребителе; эта карточка не утверждает успешную приёмку.

## Договор

`ActionInvocationProvider` принимает `children`, `onFailure(error, { actionName })`,
`isCancelled(error)` и `scopeKey?: string | number`. Провайдер связывает отказ с обработчиком
приложения; кит не импортирует предметные сервисы. `AbortError` означает отмену по умолчанию.
Отмена и успех не вызывают `onFailure`. Без обработчика отказ записывается в console.error.
Смена scopeKey при выходе или смене пользователя исключает доставку старых отказов.

`useActionInvocation<A extends readonly unknown[] = []>({ action, onSettled, actionName })`
возвращает `{ pending, invoke }`. Аргументы `invoke(...args)` повторяют аргументы action.
Без action и при повторном запуске до завершения invoke возвращает undefined.
Иначе возвращается Promise результата `ActionInvocationResult`:
`{ status: 'success' }`, `{ status: 'cancelled', reason }` или `{ status: 'failed', error }`.
Синхронное действие выполняется сразу; ожидание Promise устанавливает pending.
Защита повторного входа устанавливается до вызова action, включая синхронную рекурсию.

`onSettled` вызывается только у живого владельца в исходной сессии. `onFailure`
может получить отказ после unmount потомка, пока жив провайдер той же сессии.
Исключения обработчика, predicate и onSettled перехватываются и записываются в консоль.
Контроллер не отменяет запрос при unmount: отменой и жизненным циклом запроса управляет потребитель.

## Один контроллер для Enter и click

```tsx
'use client';
import { Button, useActionInvocation } from '@delba/ui';

export function Composer({ send }: { send: () => Promise<void> }) {
  const { invoke, pending } = useActionInvocation({ action: send });
  return <>
    <textarea onKeyDown={event => {
      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
      event.preventDefault();
      void invoke();
    }} />
    <Button disabled={pending} onClick={() => { void invoke(); }}>Отправить</Button>
  </>;
}
```

Button уже подключает этот контроллер для своего onClick. Общий контроллер нужен,
когда одну команду вызывают несколько триггеров. Для API, возвращающего resolved объект
с ошибкой, потребитель сначала преобразует его в rejection; например, RTK Query `.unwrap()`.
Ошибки отдельных полей и подтверждение сохранения остаются у формы приложения.

## Приёмка

Проверь синхронный throw, rejected Promise, отмену, повторный Enter/click, pending,
unmount владельца и смену scopeKey. Native submit, ссылка и DOM ref остаются договором
[Button](Button.md); этот контроллер не отменяет browser navigation.
