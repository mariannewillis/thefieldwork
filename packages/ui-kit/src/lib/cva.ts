import {
  cva as cvaBase,
  type VariantProps as VariantPropsBase,
} from "class-variance-authority";

/**
 * @repo/ui-kit — cva
 * Re-export of class-variance-authority with the kit's preferred defaults.
 * `compoundVariants` defaults to an empty array so every primitive's variant
 * config object has a consistent shape whether or not it needs compounds.
 *
 * Usage (once /stylesheet-primitives ships primitives that consume this):
 *
 *   const button = cva("inline-flex items-center justify-center rounded-none", {
 *     variants: {
 *       intent: {
 *         primary: "bg-accent-500 text-text-inverted",
 *         secondary: "bg-transparent border border-border-strong text-text-primary",
 *       },
 *     },
 *     defaultVariants: { intent: "primary" },
 *   });
 */
export const cva: typeof cvaBase = cvaBase;
export type VariantProps<T extends (...args: any) => any> = VariantPropsBase<T>;

export const cvaDefaults = {
  compoundVariants: [] as const,
};
