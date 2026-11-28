import { validateDComponentAnatomy } from './check/d-component-anatomy.mjs';

const projectRoot = process.cwd();
const diagnostics = validateDComponentAnatomy(projectRoot);

if (diagnostics.length) {
  console.error(`[ui:d-anatomy] ✗ ${diagnostics.join('\n[ui:d-anatomy] ✗ ')}`);
  process.exitCode = 1;
} else {
  console.log('[ui:d-anatomy] ✓ публичные D-компоненты соответствуют анатомии');
}
