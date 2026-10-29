import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const kitRoot = fileURLToPath(new URL('../..', import.meta.url));
// Independent consumers often run tests at the same time on the same Windows desktop.
const defaultPort = 20000 + createHash('sha256').update(kitRoot.toLowerCase()).digest().readUInt16BE(0) % 20000;
export const browserPort = Number(process.env.UI_BROWSER_PORT ?? defaultPort);
if (!Number.isInteger(browserPort) || browserPort < 1024 || browserPort > 65535) throw new Error('Invalid UI_BROWSER_PORT');
export const browserUrl = `http://127.0.0.1:${browserPort}`;
