export interface ParsedCount {
  to: number;
  prefix: string;
  suffix: string;
  grouped: boolean;
  decimal?: { separator: string; places: number };
}

const NBSP = ' ';

// Достаём число с обвязкой из текстового контента counter'а: «3 000+» → { to: 3000, suffix: '+', grouped: true },
// «70%» → { to: 70, suffix: '%' }, «24/7» → { to: 24, suffix: '/7' }, «до 50%» → { to: 50, prefix: 'до ', suffix: '%' }.
// Число начинается и кончается цифрой: иначе пробел ПЕРЕД ним сошёл бы за разряд, и префикс пропал бы молча.
// Префикс и единица («1 год») приклеены к числу неразрывным пробелом — типограф `Text` анимированный контент не трогает, а «до»
// не должно остаться в конце строки. Нет цифр («∞») → null, тогда counter неактивен и Text рисует контент
// как есть. Явный `to` в опциях имеет приоритет над разбором (см. Counter).
export function parseCountContent(content: unknown): ParsedCount | null {
  if (typeof content !== 'string') return null;

  const match = content.match(/\d(?:[\d\s]*\d)?(?:[.,]\d+)?/);
  if (!match) return null;

  const digits = match[0];
  const index = match.index ?? 0;
  const decimal = digits.match(/([.,])(\d+)$/);
  const to = Number(digits.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(to)) return null;

  return {
    to,
    grouped: /\s/.test(digits),
    ...(decimal?.[1] && decimal[2] ? { decimal: { separator: decimal[1], places: decimal[2].length } } : {}),
    prefix: content.slice(0, index).trimStart().replace(/\s+$/, NBSP),
    suffix: content
      .slice(index + digits.length)
      .trimEnd()
      .replace(/^\s+/, NBSP),
  };
}
