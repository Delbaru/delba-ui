import type { FrontendConfig } from '@delba/frontend/config';
import { withFrontend } from '@delba/frontend/next';
import { prepareFrontend, resolveFrontendConfiguration } from '@delba/frontend/module';
import { prepareNextEnvironment } from '@delba/frontend/next-env';

import { starterFrontend as settings } from '../../../tools/visual/starter';
void withFrontend({}, { settings });
void prepareFrontend({ root: '/project', settings, env: {} });
void resolveFrontendConfiguration(settings, {}, { operation: 'build', environment: 'test' });
void prepareNextEnvironment({ DELBA_PUBLIC_ENV: '{}' });
// @ts-expect-error Explicit Frontend settings are mandatory.
void withFrontend({});
// @ts-expect-error Legacy config paths are unsupported.
void withFrontend({}, { config: 'delba.config.ts' });
// @ts-expect-error Technical scan settings belong to generation policy.
const legacy: FrontendConfig = { scan: ['src'] };
void legacy;
