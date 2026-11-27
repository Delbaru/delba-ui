import type { FrontendConfig } from '@delba/frontend/config';
import { withFrontend } from '@delba/frontend/next';
import { prepareFrontend, resolveFrontendConfiguration, generateThemeAxes } from '@delba/frontend/module';
import { prepareNextEnvironment } from '@delba/frontend/next-env';

const settings = { theme: { sources: ['theme'], padding: { field: [8, 12] } } } as const satisfies FrontendConfig;
void withFrontend({}, { settings });
void prepareFrontend({ root: '/project', settings, env: {} });
void resolveFrontendConfiguration(settings, {}, { operation: 'build', environment: 'test' });
void prepareNextEnvironment({ DELBA_PUBLIC_ENV: '{}' });
void generateThemeAxes({
    root: '/project', directory: 'theme', source: 'theme/axes.ts',
    fills: { paper: 'white' }, lines: { line: [1, 'black'] }, texts: { ink: 'black' }, iconColors: {},
    fillClass: (name: 'paper') => `fill_${name}`,
    borderClass: (name: 'line') => `border_${name}`,
    textClass: (name: 'ink') => `text_${name}`,
});
// @ts-expect-error Explicit Frontend settings are mandatory.
void withFrontend({});
// @ts-expect-error Legacy config paths are unsupported.
void withFrontend({}, { config: 'delba.config.ts' });
// @ts-expect-error Technical scan settings belong to generation policy.
const legacy: FrontendConfig = { scan: ['src'] };
void legacy;
