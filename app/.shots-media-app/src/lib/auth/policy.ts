/**
 * Password rules. Deliberately free of any Node import, because the sign-in
 * and change-password FORMS need these values in the browser.
 *
 * This split is not tidiness. These constants previously lived beside the
 * scrypt code, and importing them into the client component dragged
 * `node:crypto` into the browser bundle — the form silently failed to render
 * while the build reported success. `password.ts` is now marked server-only so
 * that mistake becomes a build error rather than a blank screen.
 */

/**
 * Length is the only rule that reliably buys strength, so it does the work
 * here. Composition rules ("one capital, one symbol") are deliberately absent:
 * they push people toward Password1! and are no longer recommended by either
 * NCSC or NIST.
 */
export const MIN_PASSWORD_LENGTH = 12;

export function validateNewPassword(
  password: string,
  { username, currentDefault }: { username: string; currentDefault: string },
): string | null {
  const p = password.normalize("NFKC");
  if (p.length < MIN_PASSWORD_LENGTH) {
    return `Please use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you will remember is stronger than a short word with symbols in it.`;
  }
  if (p.length > 200) {
    return "That is longer than 200 characters — please shorten it.";
  }
  if (p.toLowerCase() === currentDefault.toLowerCase()) {
    return "That is the temporary password. Please choose a different one.";
  }
  if (p.toLowerCase() === username.toLowerCase()) {
    return "Please choose something other than your email address.";
  }
  return null;
}
