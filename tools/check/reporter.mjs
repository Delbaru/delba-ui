import path from 'node:path';
import { inspect } from 'node:util';

/** Node test runner передаёт события; печатаем причины ошибок и сохраняем stderr тестов. */
export default async function* report(events) {
  for await (const { type, data } of events) {
    if (type === 'test:stderr') process.stderr.write(data.message);
    if (type !== 'test:fail' || data.details?.error?.failureType === 'subtestsFailed') continue;
    const location = data.file ? `${path.relative(process.cwd(), data.file)}:${data.line}:${data.column}` : '';
    const error = data.details?.error;
    yield `${data.name}\n${location}\n${inspect(error?.cause ?? error, { colors: false, depth: 4 })}\n`;
  }
}
