import { register, createRequire } from 'node:module';
import { accessSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Unit/SSR tests exercise behavior; actual styles are compiled and checked by the browser gate.
register('./unit-styles.mjs', import.meta.url);

// Existing SSR probes intentionally use createRequire. Keep their stylesheet handling identical.
const unitRequire = createRequire(import.meta.url);
for (const extension of ['.scss', '.css']) {
  unitRequire.extensions[extension] = (module, filename) => {
    accessSync(filename);
    module.exports = Object.freeze({});
  };
}

unitRequire.extensions['.svg'] = (module, filename) => {
  accessSync(filename);
  module.exports = pathToFileURL(filename).href;
};
