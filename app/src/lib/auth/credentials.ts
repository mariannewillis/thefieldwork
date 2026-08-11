import "server-only";

/**
 * DEPRECATED — superseded by ./users.ts when accounts gained an email address
 * and stopped being a single pinned row.
 *
 * Kept only as a re-export so nothing dangles mid-refactor. Nothing imports it;
 * it can be deleted.
 */
export {
  DEFAULT_USERNAME,
  DEFAULT_PASSWORD,
  findByUsername,
  findById,
  setPassword,
} from "./users";
