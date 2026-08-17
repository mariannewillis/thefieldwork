-- Workshops, and the pictures on a workshop's page.
--
-- HAND-WRITTEN. `prisma migrate dev --create-only` needs a reachable database
-- to diff against and there is none outside Replit, so this is the diff Prisma
-- would have produced, written out. It creates two new tables and touches
-- nothing that already exists, which is the case where hand-writing is safe:
-- there are no rows to lose and no constraint to rename.
--
-- Apply it with `npm run db:deploy` on Replit, where DATABASE_URL is set.

-- CreateTable
CREATE TABLE "Workshop" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    -- DATE, not TIMESTAMP. The day is a day; a timestamp would let a timezone
    -- move Saturday the 20th to Friday the 19th on a server west of London.
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "addressLines" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "gettingThere" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    -- Pence. An INTEGER because this is money.
    "priceGBP" INTEGER NOT NULL,
    "refundDays" INTEGER NOT NULL DEFAULT 14,
    "heroImage" TEXT,
    "heroAlt" TEXT,
    "filmUrl" TEXT,
    "filmPoster" TEXT,
    "filmDuration" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopImage" (
    "id" SERIAL NOT NULL,
    "workshopId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    -- NOT NULL. No picture goes on the site without a line saying what is in it.
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "WorkshopImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_slug_key" ON "Workshop"("slug");

-- CreateIndex
CREATE INDEX "Workshop_published_date_idx" ON "Workshop"("published", "date");

-- CreateIndex
CREATE INDEX "WorkshopImage_workshopId_position_idx" ON "WorkshopImage"("workshopId", "position");

-- AddForeignKey
-- ON DELETE CASCADE: a picture has no life of its own. Deleting the workshop
-- takes its rail with it rather than leaving orphan rows pointing nowhere.
ALTER TABLE "WorkshopImage"
  ADD CONSTRAINT "WorkshopImage_workshopId_fkey"
  FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
