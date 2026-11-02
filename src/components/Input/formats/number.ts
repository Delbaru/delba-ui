export function normalizeNumberOptions(options?: readonly number[]): number[] {
  if (!options?.length) return [];

  const finiteOptions = options.filter(Number.isFinite);
  return Array.from(new Set(finiteOptions)).sort((left, right) => left - right);
}

export function isNumberCharacterAllowed(key: string, min?: number): boolean {
  if (key.length !== 1) return true;
  if (key >= '0' && key <= '9') return true;
  if (key === '.' || key === ',') return true;
  return key === '-' && !(min !== undefined && Number.isFinite(min) && min >= 0);
}

export interface NumberStepOptions {
  currentValue: string;
  options: readonly number[];
  delta: number;
  min?: number;
  max?: number;
  field?: HTMLInputElement | null;
}

function chooseOptionStep(options: NumberStepOptions) {
  const { currentValue, options: candidates, delta, min, max } = options;
  const boundedOptions = candidates.filter(
    (option) => (min === undefined || option >= min) && (max === undefined || option <= max),
  );
  const firstOption = boundedOptions[0];
  const lastOption = boundedOptions[boundedOptions.length - 1];

  if (firstOption === undefined || lastOption === undefined) return undefined;

  const numericValue = currentValue === '' ? Number.NaN : Number(currentValue);
  if (!Number.isFinite(numericValue)) return delta > 0 ? firstOption : lastOption;

  const exactIndex = boundedOptions.indexOf(numericValue);
  if (exactIndex >= 0) {
    const nextIndex = Math.min(Math.max(exactIndex + delta, 0), boundedOptions.length - 1);
    return boundedOptions[nextIndex] ?? lastOption;
  }

  if (delta > 0) return boundedOptions.find((option) => option > numericValue) ?? lastOption;
  return [...boundedOptions].reverse().find((option) => option < numericValue) ?? firstOption;
}

function stepWithNativeInput({ currentValue, delta, field }: NumberStepOptions) {
  if (!field) return undefined;

  const view = field.ownerDocument.defaultView;
  if (!view) return undefined;

  const clonedField = field.cloneNode(false);
  if (!(clonedField instanceof view.HTMLInputElement)) return undefined;

  clonedField.value = currentValue;
  try {
    clonedField.stepUp(delta);
  } catch {
    return undefined;
  }

  return clonedField.value ? Number(clonedField.value) : undefined;
}

/** Steps through provided choices first, then delegates native step rules to a detached input. */
export function calculateNumberStep(options: NumberStepOptions) {
  const optionStep = chooseOptionStep(options);
  if (optionStep !== undefined) return optionStep;

  return stepWithNativeInput(options);
}
