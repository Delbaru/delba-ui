import { pathToFileURL } from 'node:url';
import { prepareNextEnvironment } from './next-env.mjs';

prepareNextEnvironment();
process.on('disconnect', () => process.exit(0));
const [, , entry, ...args] = process.argv;
process.argv = [process.execPath, entry, ...args];
await import(pathToFileURL(entry).href);
