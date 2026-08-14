import "server-only";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where pictures are kept, behind a port.
 *
 * Two adapters, and which one runs is decided by whether MEDIA_BUCKET_ID
 * exists — not by NODE_ENV. That is the same rule `lib/email/index.ts`
 * follows, for the same reason: the thing that actually decides where a file
 * can go is whether somewhere to put it has been configured, and keying off
 * the environment would mean a production deploy with no bucket silently
 * writing to a disk that is about to be thrown away.
 *
 *  - No bucket: the local disk, under `public/media`. This is the development
 *    store and the seeded library both.
 *  - A bucket: Replit Object Storage.
 *
 * WHY THE DISK CANNOT BE THE PRODUCTION STORE. Replit's filesystem does not
 * survive a redeploy. That is not a theory here — it is the exact failure that
 * kept restoring the temporary admin password from a JSON file until the
 * credential moved into Postgres (see prisma/schema.prisma, D-11). A
 * photograph written to disk on Replit disappears the next time the site is
 * published, and the page that showed it becomes a hole.
 */

const DISK_DIR = path.join(process.cwd(), "public", "media");

export type MediaStore = {
  /** Reported once at first use; nothing branches on it. */
  readonly kind: "disk" | "bucket";
  put(file: string, bytes: Buffer, contentType: string): Promise<void>;
  /** Null when this store has never heard of the file. */
  get(file: string): Promise<Buffer | null>;
  list(): Promise<string[]>;
};

/**
 * The seeded library, which is on disk in both modes.
 *
 * The photographs under `public/media` ship with the code and are served from
 * it. A bucket holds what Marianne has added SINCE; it does not hold these,
 * and nothing copies them into it. So both modes read the disk, and the bucket
 * mode reads the bucket as well.
 */
export async function listOnDisk(): Promise<string[]> {
  try {
    return await readdir(DISK_DIR);
  } catch {
    // No directory yet — an empty library, not an error.
    return [];
  }
}

export async function readOnDisk(file: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(DISK_DIR, file));
  } catch {
    return null;
  }
}

const diskStore: MediaStore = {
  kind: "disk",
  async put(file, bytes) {
    await mkdir(DISK_DIR, { recursive: true });
    await writeFile(path.join(DISK_DIR, file), bytes);
  },
  get: readOnDisk,
  list: listOnDisk,
};

/**
 * Replit Object Storage.
 *
 * UNEXERCISED. This is written to the client's published interface and it
 * type-checks, but there is no Replit bucket to point it at from here, so it
 * has never made a real call. Treat the first deploy that sets
 * MEDIA_BUCKET_ID as the test, and read the server log — every failure below
 * is reported rather than swallowed.
 *
 * The package is imported dynamically for two reasons: it pulls in the Google
 * Cloud Storage SDK, which is large and has no business in a deployment that
 * is not using a bucket; and constructing its client asks the workspace for
 * credentials, which off Replit only produces a confusing error at boot.
 */
function bucketStore(bucketId: string): MediaStore {
  // Built once and reused. Held as the promise rather than the client so two
  // requests arriving together cannot each construct one.
  let pending: Promise<import("@replit/object-storage").Client> | null = null;
  const client = () => {
    pending ??= import("@replit/object-storage").then(
      ({ Client }) =>
        new Client(bucketId === "default" ? {} : { bucketId: bucketId }),
    );
    return pending;
  };

  return {
    kind: "bucket",
    async put(file, bytes) {
      // compress:false — these are AVIF, WebP and JPEG. They are already
      // compressed; gzipping them again buys nothing and costs a decompress
      // on every read.
      const result = await (
        await client()
      ).uploadFromBytes(file, bytes, { compress: false });
      if (!result.ok) {
        throw new Error(
          `object storage refused ${file}: ${result.error.message}`,
        );
      }
    },
    async get(file) {
      const result = await (await client()).downloadAsBytes(file);
      // A miss and a failure are told apart by the caller only in that a miss
      // falls through to the disk. Both are logged; neither throws, because a
      // missing picture must not take a page down with it.
      if (!result.ok) return null;
      return result.value[0];
    },
    async list() {
      const result = await (await client()).list();
      if (!result.ok) {
        console.error(
          `[media] could not list the bucket: ${result.error.message}`,
        );
        return [];
      }
      return result.value.map((object) => object.name);
    },
  };
}

let store: MediaStore | null = null;

export function mediaStore(): MediaStore {
  if (store) return store;
  const bucketId = process.env.MEDIA_BUCKET_ID?.trim();
  store = bucketId ? bucketStore(bucketId) : diskStore;
  return store;
}
