/**
 * @repo/ui-kit — tokens.ts
 * Typed runtime constants generated from tokens.json. Do not hand-edit;
 * re-run /stylesheet. This is the 022b-sanctioned escape hatch for dynamic
 * style decisions that can't be expressed as Tailwind class names.
 *
 * DARK-DEFAULT — see src/tokens/README.md. There is no light-theme variant;
 * `tokens.color.pool.*` is the per-surface inversion this direction uses
 * instead of a page-level light mode.
 */

export const tokens = {
  color: {
    neutral: {
      50: "#FBF3F1",
      100: "#E6DCDC",
      200: "#D8BFC9",
      300: "#B0A3A8",
      400: "#95868D",
      500: "#8E6A82",
      600: "#64515D",
      700: "#4E3A48",
      800: "#3B2635",
      900: "#260F20",
      950: "#160712",
    },
    accent: {
      50: "#FBEFF6",
      100: "#F7D9EB",
      200: "#F2BADB",
      300: "#ED91C7",
      400: "#E75AAC",
      500: "#C2187A",
      600: "#A51266",
      700: "#870D50",
      800: "#67093B",
      900: "#4B062A",
      950: "#2F041A",
    },
    secondary: {
      500: "#E9C87E",
      600: "#C99A3F",
    },
    highlight: {
      300: "#F8C9BF",
      500: "#F5876F",
    },
    semantic: {
      success: "#6FCB99",
      warning: "#E9C87E",
      danger: "#F58A80",
      info: "#E9C87E",
    },
    surface: {
      base: "#160712",
      raised: "#260F20",
      overlay: "#1E0A1CE6",
      inverted: "#FBF3F1",
    },
    text: {
      primary: "#FBF3F1",
      secondary: "#D8BFC9",
      tertiary: "#8E6A82",
      inverted: "#1E0A1C",
    },
    border: {
      subtle: "#4E3A48",
      default: "#8E6A82",
      strong: "#B0A3A8",
    },
    pool: {
      surface: "#FBF3F1",
      text: "#1E0A1C",
      textSecondary: "#5A4356",
      border: "#8A7285",
      danger: "#A3221A",
      success: "#0F6B3D",
    },
  },
  typography: {
    fontFamily: {
      sans: '"Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif',
      mono: '"Azeret Mono", ui-monospace, "Cascadia Code", Menlo, monospace',
      display: '"Cormorant Garamond", Georgia, serif',
    },
    fontSize: {
      xs: "15px",
      sm: "17px",
      md: "18px",
      lg: "19px",
      xl: "21px",
      "2xl": "24px",
      "3xl": "28px",
      "4xl": "36px",
      "5xl": "48px",
      "6xl": "64px",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.05,
      snug: 1.2,
      normal: 1.6,
      relaxed: 1.7,
    },
    letterSpacing: {
      tight: "-0.005em",
      normal: "0em",
      wide: "0.18em",
    },
  },
  spacing: {
    0: "0px",
    0.5: "2px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },
  radius: {
    none: "0px",
    sm: "2px",
    md: "4px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    full: "9999px",
  },
  shadow: {
    xs: "none",
    sm: "none",
    md: "none",
    lg: "none",
    xl: "none",
  },
  motion: {
    duration: {
      instant: "80ms",
      fast: "120ms",
      normal: "150ms",
      slow: "220ms",
      slower: "320ms",
      ambient: "24000ms",
    },
    easing: {
      linear: "linear",
      standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      decel: "cubic-bezier(0, 0, 0.2, 1)",
      accel: "cubic-bezier(0.4, 0, 1, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    overlay: 1200,
    modal: 1300,
    toast: 1400,
    tooltip: 1500,
  },
} as const;

export type Tokens = typeof tokens;
export type NeutralStep = keyof Tokens["color"]["neutral"];
export type AccentStep = keyof Tokens["color"]["accent"];
export type SemanticColor = keyof Tokens["color"]["semantic"];
export type PoolToken = keyof Tokens["color"]["pool"];
export type FontSizeToken = keyof Tokens["typography"]["fontSize"];
export type SpacingToken = keyof Tokens["spacing"];
export type RadiusToken = keyof Tokens["radius"];
export type MotionDurationToken = keyof Tokens["motion"]["duration"];
export type MotionEasingToken = keyof Tokens["motion"]["easing"];
