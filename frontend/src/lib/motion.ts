/**
 * Motion tokens for `motion/react`, mirroring --duration-* in tokens.css.
 * The whole app is wrapped in <MotionConfig reducedMotion="user">, so these
 * animations are skipped for people who ask their OS to reduce motion.
 */

export const ease = [0.22, 1, 0.36, 1] as const;

export const durations = { fast: 0.15, base: 0.2, slow: 0.35 } as const;

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: durations.base, ease },
};
