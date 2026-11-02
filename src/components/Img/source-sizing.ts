import { resolveResponsive, type ResponsiveInput } from '../../core/base/responsive';
import { imageSizes, type UiScale } from '../../core/base/scale';
import type { SizeValue } from '../../core/layout/size';

type ObjectFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale_down';

interface SourceDimensions {
  width: number;
  height: number;
}

interface ImageSizingInput {
  width?: ResponsiveInput<SizeValue>;
  height?: ResponsiveInput<SizeValue>;
  aspectRatio?: ResponsiveInput<string>;
  objectFit?: ResponsiveInput<ObjectFit>;
  source: unknown;
  scale: UiScale;
}

const parseAspect = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const [widthText, heightText, ...extra] = value.split(/[/:]/);
  const width = Number(widthText);
  const height = Number(heightText);
  if (extra.length || !Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    throw new Error(`[Img] aspectRatio parts must be finite numbers. Got: ${value}`);
  }
  return width / height;
};

export function sourceDimensions(source: unknown): SourceDimensions | null {
  if (!source || typeof source !== 'object') return null;
  const candidate = 'default' in source ? source.default : source;
  if (!candidate || typeof candidate !== 'object') return null;
  const { width, height } = candidate as { width?: unknown; height?: unknown };
  return typeof width === 'number' &&
    Number.isFinite(width) &&
    width > 0 &&
    typeof height === 'number' &&
    Number.isFinite(height) &&
    height > 0
    ? { width, height }
    : null;
}

function ratioFromDimensions(width: SizeValue | null, height: SizeValue | null): number | null {
  if (typeof width === 'number' && typeof height === 'number' && height !== 0)
    return width / height;
  return null;
}

function deriveWidth(height: SizeValue | null, aspect: number | null, band: string): SizeValue {
  if (height === null) throw new Error(`[Img] cannot derive width for ${band}: height is missing`);
  if (aspect === null)
    throw new Error(`[Img] cannot derive width for ${band}: aspectRatio is missing or invalid`);
  if (typeof height === 'number') return height * aspect;
  if (height.trim().endsWith('%')) {
    throw new Error(
      `[Img] cannot derive width from percent height for ${band}. Use explicit width.`,
    );
  }
  throw new Error(`[Img] unsupported height unit for deriving width (${band}): ${height}`);
}

function multiplyWidth(width: SizeValue, factor: number): SizeValue {
  if (factor === 1) return width;
  if (typeof width === 'number') return width * factor;
  const percent = /^\s*(\d+(?:\.\d+)?)%\s*$/.exec(width)?.[1];
  if (!percent) return width;
  return `${Number((Number(percent) * factor).toFixed(2))}%`;
}

/** Build responsive source sizes, accounting for known bitmap pixels lost to cover cropping. */
export function imageSourceSizes({
  width,
  height,
  aspectRatio,
  objectFit = 'cover',
  source,
  scale,
}: ImageSizingInput): string {
  const widths = resolveResponsive(width ?? null);
  const heights = resolveResponsive(height ?? null);
  const aspects = resolveResponsive(aspectRatio ?? null);
  const fits = resolveResponsive(objectFit);
  const dimensions = sourceDimensions(source);
  const sourceAspect = dimensions ? dimensions.width / dimensions.height : null;

  const sizedWidths = widths.map((bandWidth, index) => {
    const band = ['desktop', 'mobile', 'tablet'][index] ?? 'unknown';
    const explicitAspect = parseAspect(aspects[index] ?? aspects[0] ?? undefined);
    const frameWidth = bandWidth ?? null;
    const frameHeight = heights[index] ?? null;
    const frameAspect = explicitAspect ?? ratioFromDimensions(frameWidth, frameHeight);
    const resolvedWidth = frameWidth ?? deriveWidth(frameHeight, frameAspect, band);
    const cropFactor =
      fits[index] === 'cover' && sourceAspect !== null && frameAspect !== null
        ? Math.max(1, sourceAspect / frameAspect)
        : 1;
    return multiplyWidth(resolvedWidth, cropFactor);
  });

  const [desktop, mobile, tablet] = sizedWidths as [SizeValue, SizeValue, SizeValue];
  return imageSizes({ desktop, mobile, tablet }, scale);
}
