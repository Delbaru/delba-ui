import assert from 'node:assert/strict';
import test from 'node:test';

import {
  Transition,
  combineStatus,
  motion,
  parallelTiming,
  parseDurationMs,
  resolveAtProgress,
  serialTiming,
  toProgress,
} from './transition';

test('parseDurationMs: секунды и миллисекунды одинаково в мс, пустой токен — ноль', () => {
  assert.equal(parseDurationMs('0.3s'), 300);
  assert.equal(parseDurationMs(' 300ms '), 300);
  assert.equal(parseDurationMs('0s'), 0);
  assert.equal(parseDurationMs(''), 0, 'переменной нет — движения нет');
  assert.equal(parseDurationMs('ease'), 0, 'не длительность — ноль, а не NaN');
});

test('resolveAtProgress: отметка — это доля хода', () => {
  assert.equal(resolveAtProgress('start', 400), 0);
  assert.equal(resolveAtProgress('end', 400), 1);
  assert.equal(resolveAtProgress('50%', 400), 0.5);
  assert.equal(resolveAtProgress(100, 400), 0.25, 'миллисекунды считаются от длительности');
  assert.equal(resolveAtProgress(900, 400), 1, 'дальше конца — конец');
  assert.equal(resolveAtProgress(100, 0), 1, 'нулевой ход уже весь позади (reduced motion)');
});

test('combineStatus: группа прервана, если прервали хоть одного', () => {
  assert.equal(combineStatus(['finished', 'finished']), 'finished');
  assert.equal(combineStatus(['finished', 'interrupted']), 'interrupted');
  assert.equal(combineStatus([]), 'finished', 'пустая группа доехала');
});

test('parallelTiming: длится самое долгое, прошло — у самого дальнего', () => {
  const timing = parallelTiming([
    { progress: 0.5, durationMs: 400 },
    { progress: 1, durationMs: 100 },
  ]);

  assert.deepEqual(timing, { elapsedMs: 200, durationMs: 400 });
  assert.equal(toProgress(timing), 0.5);
});

test('serialTiming: прошлые шаги целиком, текущий — куском, будущие — ноль', () => {
  const parts = [
    { progress: 1, durationMs: 200 },
    { progress: 0.5, durationMs: 400 },
    { progress: 0, durationMs: 200 },
  ];

  assert.deepEqual(serialTiming(parts, 1), { elapsedMs: 400, durationMs: 800 });
  assert.equal(toProgress(serialTiming(parts, 1)), 0.5);
});

test('toProgress: нулевая длительность — ход позади, а не деление на ноль', () => {
  assert.equal(toProgress({ elapsedMs: 0, durationMs: 0 }), 1);
});

test('Transition.done: пустой ход доехал, отметки всё равно срабатывают', async () => {
  const done = Transition.done();
  const seen: string[] = [];

  done.at('start', () => seen.push('start'));
  done.at('50%', () => seen.push('half'));
  done.at('end', () => seen.push('end'));
  done.on('progress', (progress) => seen.push(`p${progress}`));

  const result = await done;

  assert.deepEqual(result, { status: 'finished' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(seen.sort(), ['end', 'half', 'p1', 'start'], 'ни одно событие сценария не потеряно');
});

test('motion.together: ждёт всех, пустая группа — пустой ход', async () => {
  assert.deepEqual(await motion.together(), { status: 'finished' });
  assert.deepEqual(await motion.together(Transition.done(), Transition.done()), { status: 'finished' });
});

test('motion.sequence: шаги по очереди, отложенный создаётся в свой черёд', async () => {
  const order: string[] = [];
  const step = (name: string) => () => {
    order.push(name);

    return Transition.done();
  };

  const result = await motion.sequence(step('первый'), step('второй'));

  assert.deepEqual(result, { status: 'finished' });
  assert.deepEqual(order, ['первый', 'второй']);
});

test('motion.sequence: прерванный шаг обрывает очередь — остальные не стартуют', async () => {
  const order: string[] = [];
  const interrupted: Transition = {
    ...Transition.done(),
    finished: Promise.resolve({ status: 'interrupted' as const }),
    then: (onFinished) => Promise.resolve({ status: 'interrupted' as const }).then(onFinished),
  };

  const result = await motion.sequence(
    () => interrupted,
    () => {
      order.push('второй');

      return Transition.done();
    }
  );

  assert.equal(result.status, 'interrupted');
  assert.deepEqual(order, [], 'хвост очереди не догоняет пользователя после прерывания');
});
