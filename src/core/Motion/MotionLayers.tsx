import type { SurfaceMotionEffects } from './SurfaceMotion.types';
import styles from './SurfaceMotion.module.scss';

export function MotionLayers({ effects }: { effects: SurfaceMotionEffects }) {
  if (!effects.glow) return null;

  return (
    <>
      <span aria-hidden="true" data-reveal-skip="" className={styles.Glow} />
      <span aria-hidden="true" data-reveal-skip="" className={styles.GlowSurface} />
    </>
  );
}
