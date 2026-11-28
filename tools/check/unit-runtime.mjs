import { register, createRequire } from 'node:module';
import { accessSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Unit and SSR tests load components through the stylesheet stub.
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
