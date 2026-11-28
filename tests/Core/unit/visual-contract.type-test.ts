import type { FrontendConfig, FrontendTuple, FrontendTypography } from '@delba/frontend/config';
import type { ResponsiveValue } from '@delba/frontend';
import { starterFrontend } from '../../../tools/visual/starter';

const complete: FrontendConfig = starterFrontend;
const tuple: ResponsiveValue<number> = [4444, null, 16];
const typeRole: FrontendTypography = {
    fontFamily: ['primary', null, 'primary'],
    fontSize: [13, 19, 18],
    fontWeight: [400, 400, 600],
    lineHeight: [1.5, 'normal', 1.4],
    letterSpacing: [0.2, null, -0.1],
    textTransform: ['none', null, 'uppercase'],
};
// @ts-expect-error An authored responsive scalar is unsupported.
const scalar: ResponsiveValue<number> = 16;
// @ts-expect-error Short tuples do not inherit desktop.
const short: FrontendTuple<number> = [24, 16];
// @ts-expect-error Typography is a full role object, not a role-name list.
const oldTypography: FrontendConfig['typography'] = ['p1'];
// @ts-expect-error Both interactive color roles declare all four states.
const missingState: FrontendConfig['colors']['primary'] = { normal: '#000', hover: '#111', foreground: '#fff' };
void [complete, tuple, typeRole, scalar, short, oldTypography, missingState];
