import type { Config } from "tailwindcss";

/**
 * @repo/ui-kit — tailwind.config.ts
 * Every value below is a `var(--*)` reference into tokens.css — no hex, no
 * magic px literals. Keep this file byte-for-byte in sync with
 * preview-bootstrap.html's inline `tailwind.config` block; they express the
 * same theme once for the JIT build and once for the Play CDN preview.
 *
 * darkMode is declared for shared-config-shape compatibility with the rest
 * of the factory's stack skills. This brand has no light theme to toggle —
 * `[data-theme="dark"]` is an alias of `:root`, not an alternate palette.
 * See src/tokens/README.md before changing this.
 */
const config: Partial<Config> = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        neutral: {
          50: "var(--color-neutral-50)",
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          400: "var(--color-neutral-400)",
          500: "var(--color-neutral-500)",
          600: "var(--color-neutral-600)",
          700: "var(--color-neutral-700)",
          800: "var(--color-neutral-800)",
          900: "var(--color-neutral-900)",
          950: "var(--color-neutral-950)",
        },
        accent: {
          50: "var(--color-accent-50)",
          100: "var(--color-accent-100)",
          200: "var(--color-accent-200)",
          300: "var(--color-accent-300)",
          400: "var(--color-accent-400)",
          500: "var(--color-accent-500)",
          600: "var(--color-accent-600)",
          700: "var(--color-accent-700)",
          800: "var(--color-accent-800)",
          900: "var(--color-accent-900)",
          950: "var(--color-accent-950)",
        },
        secondary: {
          500: "var(--color-secondary-500)",
          600: "var(--color-secondary-600)",
        },
        highlight: {
          300: "var(--color-highlight-300)",
          500: "var(--color-highlight-500)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        surface: {
          base: "var(--color-surface-base)",
          raised: "var(--color-surface-raised)",
          overlay: "var(--color-surface-overlay)",
          inverted: "var(--color-surface-inverted)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          inverted: "var(--color-text-inverted)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
        },
        pool: {
          surface: "var(--color-pool-surface)",
          text: "var(--color-pool-text)",
          "text-secondary": "var(--color-pool-text-secondary)",
          border: "var(--color-pool-border)",
          danger: "var(--color-pool-danger)",
          success: "var(--color-pool-success)",
        },
      },
      fontFamily: {
        sans: "var(--font-family-sans)",
        mono: "var(--font-family-mono)",
        display: "var(--font-family-display)",
      },
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        md: "var(--font-size-md)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
        "3xl": "var(--font-size-3xl)",
        "4xl": "var(--font-size-4xl)",
        "5xl": "var(--font-size-5xl)",
        "6xl": "var(--font-size-6xl)",
      },
      fontWeight: {
        regular: "var(--font-weight-regular)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        snug: "var(--line-height-snug)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      letterSpacing: {
        tight: "var(--letter-spacing-tight)",
        normal: "var(--letter-spacing-normal)",
        wide: "var(--letter-spacing-wide)",
      },
      spacing: {
        0.5: "var(--spacing-0_5)",
        1: "var(--spacing-1)",
        2: "var(--spacing-2)",
        3: "var(--spacing-3)",
        4: "var(--spacing-4)",
        5: "var(--spacing-5)",
        6: "var(--spacing-6)",
        8: "var(--spacing-8)",
        10: "var(--spacing-10)",
        12: "var(--spacing-12)",
        16: "var(--spacing-16)",
        20: "var(--spacing-20)",
        24: "var(--spacing-24)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionDuration: {
        instant: "var(--motion-duration-instant)",
        fast: "var(--motion-duration-fast)",
        DEFAULT: "var(--motion-duration-normal)",
        normal: "var(--motion-duration-normal)",
        slow: "var(--motion-duration-slow)",
        slower: "var(--motion-duration-slower)",
      },
      transitionTimingFunction: {
        linear: "var(--motion-easing-linear)",
        standard: "var(--motion-easing-standard)",
        decel: "var(--motion-easing-decel)",
        accel: "var(--motion-easing-accel)",
        spring: "var(--motion-easing-spring)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
        tooltip: "var(--z-tooltip)",
      },
    },
  },
};

export default config;
