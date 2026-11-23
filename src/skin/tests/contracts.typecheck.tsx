import { createRef, type Ref } from 'react';

import { defineSkin, resolveSkin, type SkinPreset } from '../index';
import { defineSkin as defineRuntimeSkin, useSkin, type SkinPreset as RuntimePreset } from '../runtime';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

const axes = { fill: ['none', 'surface'] } as const;
const scales = { gap: [0, 4, 8] } as const;
const styles = { skin: 'skin' };
const plain = defineSkin({ axes, presets: { bare: { fill: 'none' } } });
const scaled = defineSkin({ axes, scales, presets: { compact: { gap: 4 } } });
const runtimePlain = defineRuntimeSkin({ component: 'Plain', presetProp: 'skin', axes, presets: { bare: {} } });
const runtimeScaled = defineRuntimeSkin({ component: 'Scaled', presetProp: 'skin', axes, scales, presets: { compact: { gap: 4 } } });

export type PureScaleNames = Expect<Equal<keyof NonNullable<typeof scaled.scales>, 'gap'>>;
export type PureScaleSteps = Expect<Equal<NonNullable<typeof scaled.scales>['gap'][number], 0 | 4 | 8>>;
export type PureEmptyScales = Expect<Equal<keyof NonNullable<typeof plain.scales>, never>>;
export type RuntimeEmptyScales = Expect<Equal<keyof NonNullable<typeof runtimePlain.scales>, never>>;
export type RuntimeScaleNames = Expect<Equal<keyof NonNullable<typeof runtimeScaled.scales>, 'gap'>>;
export type PureInvalidStep = Expect<Equal<{ gap: 3 } extends SkinPreset<typeof axes, typeof scales> ? true : false, false>>;
export type RuntimeInvalidStep = Expect<Equal<{ gap: 3 } extends RuntimePreset<typeof axes, typeof scales> ? true : false, false>>;

/** Compiled by the library gate; never mounted or run by the unit runner. */
export function useSkinContractProof() {
  const plainResult = resolveSkin(plain, styles, 'bare', { fill: 'surface' });
  const pureResult = resolveSkin(scaled, styles, 'compact', { fill: 'surface', gap: [0, null, 2.5] });
  const input = useSkin(runtimePlain, { styles, props: { fill: 'surface' }, ref: createRef<HTMLInputElement>() });
  const cleanupRef = (_node: HTMLButtonElement | null) => () => {};
  const button = useSkin(runtimeScaled, { styles, props: { gap: [0, null, 2.5] }, ref: cleanupRef });
  const inputRef: Ref<HTMLInputElement> | undefined = input.ref;
  const buttonRef: Ref<HTMLButtonElement> | undefined = button.ref;

  // @ts-expect-error No scale names exist on a definition that omitted scales.
  resolveSkin(plain, styles, 'bare', { gap: 4 });
  // @ts-expect-error Instance props cannot widen the skin's axis vocabulary.
  useSkin(runtimePlain, { styles, props: { fill: 'unknown' } });
  // @ts-expect-error Instance props cannot invent a scale name.
  useSkin(runtimeScaled, { styles, props: { padding: [0, 0, 0] } });
  // @ts-expect-error Preset values must belong to the declared scale steps.
  defineRuntimeSkin({ component: 'Invalid', presetProp: 'skin', axes, scales, presets: { invalid: { gap: 3 } } });
  // @ts-expect-error The pure definition enforces the same preset steps.
  defineSkin({ axes, scales, presets: { invalid: { gap: 3 } } });

  return <><input ref={inputRef} data-fill={plainResult.axes.fill} /><button ref={buttonRef} data-gap={pureResult.axes.gap?.toString()} /></>;
}
