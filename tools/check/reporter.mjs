import path from 'node:path';
import { inspect } from 'node:util';

/** Node test runner передаёт события; печатаем причины ошибок и сохраняем stderr тестов. */
export default async function* report(events) {
  const slow = [];
  for await (const { type, data } of events) {
    if (type === 'test:pass' && data.nesting === 0 && data.details?.duration_ms >= 1000) {
      slow.push({ name: data.name, ms: data.details.duration_ms });
    }
    if (type === 'test:summary' && !data.file) {
      yield `Tests: ${data.counts.passed} passed, ${data.counts.failed} failed, ${data.counts.skipped} skipped; ${(data.duration_ms / 1000).toFixed(1)}s\n`;
    }
    if (type === 'test:stderr') process.stderr.write(data.message);
    if (type !== 'test:fail' || data.details?.error?.failureType === 'subtestsFailed') continue;
    const location = data.file ? `${path.relative(process.cwd(), data.file)}:${data.line}:${data.column}` : '';
    const error = data.details?.error;
    yield `${data.name}\n${location}\n${inspect(error?.cause ?? error, { colors: false, depth: 4 })}\n`;
  }
  for (const item of slow.sort((a, b) => b.ms - a.ms).slice(0, 5)) yield `Slow: ${(item.ms / 1000).toFixed(1)}s ${item.name}\n`;
}
