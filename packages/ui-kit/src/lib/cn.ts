import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * @repo/ui-kit — cn
 * clsx + tailwind-merge composition. Use this everywhere a component needs
 * to combine conditional classes with kit-token-derived Tailwind utilities —
 * never string-concatenate class names by hand.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
