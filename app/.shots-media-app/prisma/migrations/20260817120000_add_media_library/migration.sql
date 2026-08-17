-- The media library.
--
-- ONE NEW TABLE AND NO CHANGE TO ANY REFERENCE. Every column that names a
-- picture, a film or a file today — Workshop.heroImage, Workshop.filmPoster,
-- WorkshopImage.url, the Course and Service equivalents, Newsletter.
-- backgroundBasename, NewsletterBlock.imageBasename, the three filmUrls and
-- NewsletterAttachment.storedAs — is untouched. MediaAsset.ref holds the SAME
-- string, which is what lets every existing page keep working while the library
-- carries what is known about each one.
--
-- addedAt is nullable on purpose. A row written by an upload knows when it
-- happened; a row written by adoption does not, and today's date would be a
-- fiction. See prisma/schema.prisma.
CREATE TYPE "MediaKind" AS ENUM ('picture', 'video', 'document');

CREATE TABLE "MediaAsset" (
    "id" SERIAL NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT,
    "alt" TEXT,
    "contentType" TEXT,
    "bytes" INTEGER,
    "addedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_kind_ref_key" ON "MediaAsset"("kind", "ref");
CREATE INDEX "MediaAsset_kind_idx" ON "MediaAsset"("kind");

-- One file in the library may go out on more than one letter.
--
-- storedAs was unique when an upload to one letter was the only way a document
-- could exist. It cannot stay unique now: attaching the same handout to January
-- and to March would have required a second copy of the same bytes under a
-- second key, which is the duplication a library exists to prevent. What
-- replaces it refuses the mistake that is actually worth refusing — the same
-- file attached to the same letter twice.
DROP INDEX "NewsletterAttachment_storedAs_key";
CREATE UNIQUE INDEX "NewsletterAttachment_newsletterId_storedAs_key" ON "NewsletterAttachment"("newsletterId", "storedAs");
CREATE INDEX "NewsletterAttachment_storedAs_idx" ON "NewsletterAttachment"("storedAs");
