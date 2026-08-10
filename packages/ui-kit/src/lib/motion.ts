import { tokens } from "../tokens/tokens";

/**
 * @repo/ui-kit — motion
 * Named motion presets derived from tokens.motion. This direction's dial
 * (motion_intensity: 3) restricts the DEFAULT vocabulary to fades and linear
 * micro-transitions — see src/tokens/README.md. `springPop` exists for
 * schema completeness but must not be reached for by default; if a screen
 * genuinely needs it, that is a deliberate per-screen decision, not a kit
 * default.
 */

export type MotionPreset = {
  transitionProperty: string;
  transitionDuration: string;
  transitionTimingFunction: string;
};

export const fadeIn: MotionPreset = {
  transitionProperty: "opacity",
  transitionDuration: tokens.motion.duration.normal,
  transitionTimingFunction: tokens.motion.easing.standard,
};

export const linkHover: MotionPreset = {
  transitionProperty: "color, border-color, text-decoration-color",
  transitionDuration: tokens.motion.duration.fast,
  transitionTimingFunction: tokens.motion.easing.linear,
};

export const buttonHover: MotionPreset = {
  transitionProperty: "background-color, color",
  transitionDuration: tokens.motion.duration.fast,
  transitionTimingFunction: tokens.motion.easing.linear,
};

export const slideUp: MotionPreset = {
  transitionProperty: "transform, opacity",
  transitionDuration: tokens.motion.duration.normal,
  transitionTimingFunction: tokens.motion.easing.decel,
};

export const scaleIn: MotionPreset = {
  transitionProperty: "transform, opacity",
  transitionDuration: tokens.motion.duration.slow,
  transitionTimingFunction: tokens.motion.easing.decel,
};

/** NOT used as a default anywhere in this direction (motion_intensity <= 3
 * bars spring-by-default). Shipped for schema completeness only. */
export const springPop: MotionPreset = {
  transitionProperty: "transform",
  transitionDuration: tokens.motion.duration.slow,
  transitionTimingFunction: tokens.motion.easing.spring,
};

/** The hero plate's one ambient drift — 24s scale from 1.045 to 1.1,
 * matching the approved mockup's `clearing-drift` keyframe exactly. Applied
 * to at most one element per page (the hero plate) per the direction's
 * near-zero motion budget. Respects prefers-reduced-motion by freezing at
 * the 1.045 starting scale — see globals.css. */
export const ambientPlateDrift = {
  animationDuration: tokens.motion.duration.ambient,
  animationTimingFunction: "ease-in-out",
  animationIterationCount: "infinite",
  animationDirection: "alternate",
} as const;

export const motion = {
  fadeIn,
  linkHover,
  buttonHover,
  slideUp,
  scaleIn,
  springPop,
  ambientPlateDrift,
};
