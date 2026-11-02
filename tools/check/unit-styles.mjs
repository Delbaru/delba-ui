import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function load(url, context, nextLoad) {
  if (new URL(url).pathname.endsWith('.svg')) {
    await access(fileURLToPath(url));
    return { format: 'module', source: 'export default ' + JSON.stringify(url) + ';', shortCircuit: true };
  }
  if (!/\.(?:scss|css)$/.test(new URL(url).pathname)) return nextLoad(url, context);
  await access(fileURLToPath(url));
  return { format: 'module', source: 'export default Object.freeze({});', shortCircuit: true };
}
