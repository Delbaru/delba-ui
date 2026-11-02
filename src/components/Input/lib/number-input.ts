export function normalizeNumberOptions(options?: readonly number[]) {
  if (!options?.length) return [];
  return Array.from(new Set(options.filter(Number.isFinite))).sort((left, right) => left - right);
}

export function isNumberCharacterAllowed(key: string, min?: number) {
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

export function calculateNumberStep({
  currentValue,
  options,
  delta,
  min,
  max,
  field,
}: NumberStepOptions) {
  const boundedOptions = options.filter(
    (option) => (min === undefined || option >= min) && (max === undefined || option <= max),
  );
  const firstOption = boundedOptions[0];
  const lastOption = boundedOptions[boundedOptions.length - 1];

  if (firstOption !== undefined && lastOption !== undefined) {
    const numericValue = currentValue === '' ? Number.NaN : Number(currentValue);
    if (!Number.isFinite(numericValue)) return delta > 0 ? firstOption : lastOption;

    const exactIndex = boundedOptions.indexOf(numericValue);
    if (exactIndex >= 0) {
      const nextIndex = Math.min(Math.max(exactIndex + delta, 0), boundedOptions.length - 1);
      return boundedOptions[nextIndex] ?? lastOption;
    }

    if (delta > 0) return boundedOptions.find((option) => option > numericValue) ?? lastOption;
    const lowerOptions = [...boundedOptions].reverse();
    return lowerOptions.find((option) => option < numericValue) ?? firstOption;
  }

  if (!field) return undefined;
  const view = field.ownerDocument.defaultView;
  const clonedField = field.cloneNode(false);
  if (!view || !(clonedField instanceof view.HTMLInputElement)) return undefined;

  clonedField.value = currentValue;
  try {
    clonedField.stepUp(delta);
  } catch {
    return undefined;
  }

  return clonedField.value ? Number(clonedField.value) : undefined;
}
