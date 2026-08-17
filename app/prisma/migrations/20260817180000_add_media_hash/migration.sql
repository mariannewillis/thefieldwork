-- Identity by content, so the library cannot hold the same thing twice.
--
-- ONE NULLABLE COLUMN AND ONE PLAIN INDEX. Nothing is backfilled here, and that
-- is deliberate: the hash of a picture is the hash of a FILE in the store, and
-- SQL cannot read the store. `adoptEverything` fills these in on the first read
-- of the library, one row at a time, and every row written by an upload from
-- then on arrives with its hash already computed. A row whose bytes have gone
-- missing keeps a null and simply never joins a duplicate group.
--
-- NOT UNIQUE. Two rows sharing a hash is precisely the state that already
-- exists in this database — four groups, eighteen files — and a unique index
-- would refuse the migration rather than let the Media screen clear them.
ALTER TABLE "MediaAsset" ADD COLUMN "hash" TEXT;

CREATE INDEX "MediaAsset_hash_idx" ON "MediaAsset"("hash");
